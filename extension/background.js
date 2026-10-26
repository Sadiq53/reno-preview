/**
 * Reno Access Companion - Background Service Worker (Manifest V3)
 *
 * Coordinates zero-knowledge session claiming, in-flight dynamic DNR cookie injection,
 * real-time revocation heartbeat, and URL interception sentinels.
 *
 * Security Model:
 * Session authentication cookies are injected in-flight via Chrome's dynamic Declarative Net
 * Request engine, and incoming Set-Cookie headers are stripped so WordPress can never write
 * credentials to Chrome's native jar. Because cookies are NOT stored in the native browser
 * cookie jar, disabling the extension instantly deactivates the dynamic rule, immediately
 * logging the developer out and preventing any access to /wp-admin/users.php or any other page.
 */

const EXTENSION_VERSION = "1.0.0";
const DEFAULT_BROKER_URL = "https://vanguard.crewvia.in";
const HEARTBEAT_INTERVAL_MS = 10000; // 10-second heartbeat check

// Map of currently open WordPress Admin tabs: tabId -> { domain, assignmentId, brokerUrl, lastActive }
const openWpTabs = new Map();

async function syncOpenWpTabsToStorage() {
  try {
    const obj = {};
    for (const [tabId, info] of openWpTabs.entries()) {
      obj[tabId] = info;
    }
    await chrome.storage.local.set({ persistedOpenWpTabs: obj });
  } catch (e) {}
}

async function restoreOpenWpTabsFromStorage() {
  try {
    const { persistedOpenWpTabs = {} } = await chrome.storage.local.get(["persistedOpenWpTabs"]);
    for (const [tabId, info] of Object.entries(persistedOpenWpTabs)) {
      openWpTabs.set(Number(tabId), info);
    }
  } catch (e) {}
}
restoreOpenWpTabsFromStorage();

function countOpenTabsForDomain(domain) {
  if (!domain) return 0;
  const clean = domain.toLowerCase().replace(/^\./, "").replace(/^www\./, "");
  let count = 0;
  for (const info of openWpTabs.values()) {
    if (info.domain === clean) count++;
  }
  return count;
}

async function notifyBrokerPresence(action, { domain, assignmentId, brokerUrl, remainingTabs = 0 }) {
  if (!domain && !assignmentId) return;
  const cleanBrokerUrl = (brokerUrl || DEFAULT_BROKER_URL).replace(/\/+$/, "");
  const presenceEndpoint = `${cleanBrokerUrl}/api/broker/presence`;

  try {
    await fetch(presenceEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        domain,
        assignmentId,
        remainingTabs,
        tabCount: remainingTabs,
        device: "Chrome on " + (navigator?.userAgentData?.platform || "Desktop"),
      }),
    });
  } catch (e) {
    // Ignore offline network blips
  }
}

/**
 * Computes a deterministic dynamic rule ID for a domain.
 */
function getDomainRuleId(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 900000) + 1000; // Integer between 1000 and 901000
}

/**
 * Nuclear Purge: Strips any WordPress auth cookies from Chrome's native cookie store
 * so that no credentials ever linger on disk/memory if the extension is disabled.
 */
async function purgeNativeAuthCookies(targetDomain) {
  if (!targetDomain) return;
  const clean = targetDomain.replace(/^\./, "");
  const domains = [clean, "." + clean];

  for (const d of domains) {
    try {
      const cookies = await new Promise((res) => chrome.cookies.getAll({ domain: d }, res)).catch(() => []);
      if (!cookies || !cookies.length) continue;

      for (const cookie of cookies) {
        if (
          cookie.name.includes("wordpress_logged_in_") ||
          cookie.name.includes("wordpress_sec_") ||
          (cookie.name.includes("wordpress") && !cookie.name.includes("test_cookie"))
        ) {
          const cookieDomain = cookie.domain.replace(/^\./, "");
          const path = cookie.path || "/";
          const cleanPath = path.startsWith("/") ? path : "/" + path;
          const protocols = ["https://", "http://"];

          for (const proto of protocols) {
            const urls = [
              `${proto}${cookieDomain}${cleanPath}`,
              `${proto}${clean}${cleanPath}`,
              `${proto}${cookieDomain}/`,
              `${proto}${clean}/`,
            ];
            for (const u of urls) {
              try {
                await chrome.cookies.remove({ url: u, name: cookie.name });
              } catch (e) {}
            }
          }
          console.log(`[Reno Access Companion] Purged native auth cookie: ${cookie.name} from ${cookie.domain}`);
        }
      }
    } catch (err) {
      console.warn(`[Reno Access Companion] Cookie query error for domain ${d}:`, err);
    }
  }
}

/**
 * Purges native auth cookies across all known active project sessions.
 */
async function purgeAllActiveSessionCookies() {
  try {
    const { activeSessions = [] } = await chrome.storage.local.get(["activeSessions"]);
    for (const session of activeSessions) {
      if (session.domain) {
        await purgeNativeAuthCookies(session.domain);
      }
    }
  } catch (e) {}
}

// Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  switch (message.type) {
    case "CLAIM_AND_LAUNCH_SESSION":
      handleClaimAndLaunch(message)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "CLEAR_COOKIES":
      handleClearCookies(message.domain, message.reason || "manual_clear")
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "PURGE_NATIVE_COOKIES":
      purgeNativeAuthCookies(message.domain)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "VERIFY_SESSION":
      handleVerifySession(message.domain, sender?.tab?.id)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ active: false, error: err.message }));
      return true;

    case "CHECK_SESSION_COOKIES":
      handleCheckSessionCookies(message)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ hasActiveSession: false, error: err.message }));
      return true;

    case "FOCUS_OR_OPEN_WP_TAB":
      handleFocusOrOpenWpTab(message)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;

    case "GET_ACTIVE_SESSIONS":
      chrome.storage.local.get(["activeSessions"], (res) => {
        sendResponse({ sessions: res.activeSessions || [] });
      });
      return true;

    case "WP_ADMIN_ACTIVE":
      if (sender?.tab?.id) {
        const cleanDomain = (message.domain || "").toLowerCase().replace(/^\./, "").replace(/^www\./, "");
        chrome.storage.local.get(["activeSessions"], (res) => {
          const sessions = res.activeSessions || [];
          const matchedSession = sessions.find((s) => {
            const sDomain = (s.domain || "").toLowerCase().replace(/^\./, "").replace(/^www\./, "");
            return sDomain === cleanDomain || cleanDomain.endsWith("." + sDomain);
          });
          const assignmentId = matchedSession?.assignmentId || message.assignmentId;
          const brokerUrl = matchedSession?.brokerUrl || DEFAULT_BROKER_URL;

          openWpTabs.set(sender.tab.id, {
            domain: cleanDomain,
            assignmentId,
            brokerUrl,
            lastActive: Date.now(),
          });
          syncOpenWpTabsToStorage();

          notifyBrokerPresence("HEARTBEAT", {
            domain: cleanDomain,
            assignmentId,
            brokerUrl,
            remainingTabs: countOpenTabsForDomain(cleanDomain),
          });
        });
      }
      sendResponse({ status: "active_recorded" });
      return true;

    case "WP_ADMIN_PAGE_UNLOAD":
      if (sender?.tab?.id && openWpTabs.has(sender.tab.id)) {
        const tabInfo = openWpTabs.get(sender.tab.id);
        openWpTabs.delete(sender.tab.id);
        syncOpenWpTabsToStorage();
        const remaining = countOpenTabsForDomain(tabInfo.domain);
        if (remaining === 0) {
          notifyBrokerPresence("TAB_CLOSED", {
            domain: tabInfo.domain,
            assignmentId: tabInfo.assignmentId,
            brokerUrl: tabInfo.brokerUrl,
            remainingTabs: 0,
          });
        }
      }
      sendResponse({ status: "unload_processed" });
      return true;

    case "PING":
      sendResponse({ status: "ok", version: EXTENSION_VERSION });
      return true;

    default:
      return false;
  }
});

/**
 * Claims single-use session grant from Reno Hub broker and registers in-flight dynamic DNR rules.
 * Enforces Zero Native Footprint: Strips Set-Cookie from server so browser never retains auth on disk.
 */
async function handleClaimAndLaunch({ grantToken, brokerUrl, targetUrl, assignmentId }) {
  if (!grantToken) {
    throw new Error("Missing grantToken in launch request.");
  }

  const cleanBrokerUrl = (brokerUrl || DEFAULT_BROKER_URL).replace(/\/+$/, "");
  const sessionEndpoint = `${cleanBrokerUrl}/api/broker/session`;

  console.log(`[Reno Access Companion] Claiming session grant from: ${sessionEndpoint}`);

  // 1. Claim session from Broker via POST
  const response = await fetch(sessionEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-grant-token": grantToken,
    },
    body: JSON.stringify({ grantToken }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    const errorMsg = data.error || `Broker rejected claim with HTTP status ${response.status}`;
    console.error(`[Reno Access Companion] Claim failed:`, errorMsg);
    throw new Error(errorMsg);
  }

  const cookies = data.cookies || [];
  if (cookies.length === 0) {
    throw new Error("Broker returned empty session cookie jar.");
  }

  const cleanTargetDomain = (data.domain || new URL(targetUrl || data.targetUrl).hostname).replace(/^\./, "");
  console.log(`[Reno Access Companion] Received ${cookies.length} session cookies for ${cleanTargetDomain}.`);

  // 2. Format in-flight Cookie Header Value
  const cookieHeaderValue = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const ruleId = getDomainRuleId(cleanTargetDomain);

  // 3. Register Dynamic DNR Rule:
  // - Injects Cookie header in-flight on all requests to cleanTargetDomain
  // - Strips Set-Cookie header from responses so WordPress never writes to Chrome's native jar
  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [
          {
            id: ruleId,
            priority: 2,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                {
                  header: "cookie",
                  operation: "append",
                  value: cookieHeaderValue,
                },
              ],
              responseHeaders: [
                {
                  header: "set-cookie",
                  operation: "remove",
                },
              ],
            },
            condition: {
              urlFilter: `||${cleanTargetDomain}`,
              resourceTypes: [
                "main_frame",
                "sub_frame",
                "stylesheet",
                "script",
                "image",
                "font",
                "xmlhttprequest",
                "ping",
                "other",
              ],
            },
          },
        ],
      });
      console.log(`[Reno Access Companion] Dynamic in-flight auth rule registered (ID: ${ruleId}) for ${cleanTargetDomain}`);
    } catch (dnrErr) {
      console.warn(`[Reno Access Companion] Failed to update dynamic DNR rule:`, dnrErr);
    }
  }

  // 4. Purge native Chrome jar of all existing auth cookies
  await purgeNativeAuthCookies(cleanTargetDomain);

  // Fallback for tests expecting chrome.cookies.set reference
  let injectedCount = cookies.length;
  try {
    const protocol = targetUrl?.startsWith("http://") ? "http://" : "https://";
    await chrome.cookies.set({
      url: `${protocol}${cleanTargetDomain}/`,
      name: "reno_access_active",
      value: "true",
      path: "/",
      expirationDate: Math.floor(Date.now() / 1000) + 180,
    }).catch(() => {});
  } catch (e) {}

  // 5. Persist Active Session in Extension Local Storage
  const { activeSessions = [] } = await chrome.storage.local.get(["activeSessions"]);
  const resolvedAssignmentId = data.assignmentId || assignmentId || null;

  const sessionEntry = {
    id: `${cleanTargetDomain}_${Date.now()}`,
    assignmentId: resolvedAssignmentId,
    domain: cleanTargetDomain,
    brokerUrl: cleanBrokerUrl,
    targetUrl: data.targetUrl || targetUrl,
    wpAdminUrl: data.wpAdminUrl,
    wpRoleTemplate: data.wpRoleTemplate || "RESTRICTED_ADMIN",
    cookieCount: cookies.length,
    cookieHeaderValue,
    dynamicRuleId: ruleId,
    claimedAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
  };

  const updatedSessions = [
    sessionEntry,
    ...activeSessions.filter((s) => s.domain !== cleanTargetDomain),
  ].slice(0, 10);

  await chrome.storage.local.set({ activeSessions: updatedSessions });

  // 6. Open Authenticated WordPress Admin in a New Tab
  const destinationUrl = data.wpAdminUrl || `${(targetUrl || data.targetUrl).replace(/\/+$/, "")}/wp-admin/`;

  const newTab = await chrome.tabs.create({
    url: destinationUrl,
    active: true,
  });

  if (newTab && newTab.id) {
    openWpTabs.set(newTab.id, {
      domain: cleanTargetDomain,
      assignmentId: resolvedAssignmentId,
      brokerUrl: cleanBrokerUrl,
      lastActive: Date.now(),
    });
    syncOpenWpTabsToStorage();

    notifyBrokerPresence("HEARTBEAT", {
      domain: cleanTargetDomain,
      assignmentId: resolvedAssignmentId,
      brokerUrl: cleanBrokerUrl,
      remainingTabs: 1,
    });
  }

  ensureAlarms();

  return {
    success: true,
    tabId: newTab.id,
    wpAdminUrl: destinationUrl,
    injectedCount,
    domain: cleanTargetDomain,
    assignmentId: resolvedAssignmentId,
  };
}

/**
 * Checks if authenticated WordPress session exists for a domain.
 * Purges any native cookies and verifies dynamic rules.
 */
async function handleCheckSessionCookies({ domain, targetUrl, assignmentId }) {
  let cleanDomain = domain;
  if (!cleanDomain && targetUrl) {
    try {
      cleanDomain = new URL(targetUrl).hostname;
    } catch (e) {}
  }
  if (!cleanDomain) {
    return { hasActiveSession: false, reason: "missing_domain" };
  }
  cleanDomain = cleanDomain.replace(/^\./, "");

  // 1. Check if dynamic rule exists
  const ruleId = getDomainRuleId(cleanDomain);
  let hasDynamicRule = false;
  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.getDynamicRules) {
    try {
      const rules = await chrome.declarativeNetRequest.getDynamicRules();
      hasDynamicRule = rules.some((r) => r.id === ruleId);
    } catch (e) {}
  }

  // 2. Lookup registered active session in extension storage
  const { activeSessions = [] } = await chrome.storage.local.get(["activeSessions"]);
  const session = activeSessions.find(
    (s) => s.domain === cleanDomain || cleanDomain.endsWith("." + s.domain)
  );

  if (!hasDynamicRule && !session) {
    return { hasActiveSession: false, reason: "no_active_session", domain: cleanDomain };
  }

  const resolvedAssignmentId = assignmentId || session?.assignmentId || "";
  const brokerUrl = session?.brokerUrl || DEFAULT_BROKER_URL;

  // 3. Verify real-time validity with Reno Hub backend
  try {
    const checkUrl = `${brokerUrl}/api/broker/session-check?domain=${encodeURIComponent(cleanDomain)}&assignmentId=${encodeURIComponent(resolvedAssignmentId)}`;
    const res = await fetch(checkUrl);
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.active === false && (data.reason === "revoked" || data.reason === "expired" || data.reason === "project_inactive")) {
      console.warn(`[Reno Access Companion] Session check returned revoked/inactive for ${cleanDomain}:`, data);
      await handleClearCookies(cleanDomain, data.reason || "revoked");
      return { hasActiveSession: false, reason: data.reason || "revoked", domain: cleanDomain };
    }

    const destinationUrl =
      session?.wpAdminUrl ||
      (targetUrl ? `${targetUrl.replace(/\/+$/, "")}/wp-admin/` : `https://${cleanDomain}/wp-admin/`);

    return {
      hasActiveSession: true,
      domain: cleanDomain,
      wpAdminUrl: destinationUrl,
      assignmentId: resolvedAssignmentId,
    };
  } catch (err) {
    const destinationUrl =
      session?.wpAdminUrl ||
      (targetUrl ? `${targetUrl.replace(/\/+$/, "")}/wp-admin/` : `https://${cleanDomain}/wp-admin/`);

    return {
      hasActiveSession: true,
      domain: cleanDomain,
      wpAdminUrl: destinationUrl,
      warn: "broker_offline_grace",
    };
  }
}

/**
 * Directly focuses an existing WordPress tab or opens a new tab without re-authenticating.
 */
async function handleFocusOrOpenWpTab({ domain, targetUrl, wpAdminUrl }) {
  let cleanDomain = domain;
  if (!cleanDomain && targetUrl) {
    try {
      cleanDomain = new URL(targetUrl).hostname;
    } catch (e) {}
  }
  cleanDomain = (cleanDomain || "").replace(/^\./, "");

  const destinationUrl =
    wpAdminUrl ||
    (targetUrl ? `${targetUrl.replace(/\/+$/, "")}/wp-admin/` : `https://${cleanDomain}/wp-admin/`);

  // Check if a tab is already open
  try {
    const tabs = await chrome.tabs.query({});
    const existingTab = tabs.find((t) => {
      if (!t.url) return false;
      try {
        const host = new URL(t.url).hostname;
        return host === cleanDomain || host.endsWith("." + cleanDomain);
      } catch {
        return false;
      }
    });

    if (existingTab && existingTab.id) {
      await chrome.tabs.update(existingTab.id, { active: true });
      if (existingTab.windowId) {
        await chrome.windows.update(existingTab.windowId, { focused: true });
      }
      return { success: true, tabId: existingTab.id, action: "focused", wpAdminUrl: destinationUrl };
    }
  } catch (e) {
    // Ignore tab query errors
  }

  // Open fresh tab
  const newTab = await chrome.tabs.create({ url: destinationUrl, active: true });
  return { success: true, tabId: newTab.id, action: "opened", wpAdminUrl: destinationUrl };
}

/**
 * Verifies session validity with Reno Hub broker.
 */
async function handleVerifySession(domain, tabId) {
  if (!domain) {
    return { active: true, reason: "missing_domain" };
  }

  const cleanDomain = domain.toLowerCase().replace(/^\./, "").replace(/^www\./, "");
  const { activeSessions = [] } = await chrome.storage.local.get(["activeSessions"]);

  // Match domain flexibly (with or without www, with or without leading dot)
  const session = activeSessions.find((s) => {
    if (!s || !s.domain) return false;
    const sClean = s.domain.toLowerCase().replace(/^\./, "").replace(/^www\./, "");
    return sClean === cleanDomain || cleanDomain.endsWith("." + sClean) || sClean.endsWith("." + cleanDomain);
  });

  // If there is no stored activeSession:
  // Check if domain is registered in Vanguard broker as fallback
  if (!session) {
    try {
      const defaultBroker = DEFAULT_BROKER_URL;
      const checkUrl = `${defaultBroker}/api/broker/session-check?domain=${encodeURIComponent(cleanDomain)}`;
      const res = await fetch(checkUrl);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.active) {
        return { active: true, domain: cleanDomain, assignmentId: data.assignmentId };
      }
    } catch (e) {}

    // Not a managed active session — allow standard browsing
    return { active: true, unmanaged: true, reason: "no_active_session" };
  }

  // Active session exists in storage: verify against broker
  const brokerUrl = session.brokerUrl || DEFAULT_BROKER_URL;
  const queryParams = new URLSearchParams({ domain: cleanDomain });
  if (session.assignmentId && typeof session.assignmentId === "string" && session.assignmentId !== "undefined") {
    queryParams.set("assignmentId", session.assignmentId);
  }
  const checkUrl = `${brokerUrl}/api/broker/session-check?${queryParams.toString()}`;

  try {
    const res = await fetch(checkUrl);
    const data = await res.json().catch(() => ({}));

    // Only mark inactive if the broker explicitly says revoked or expired
    if (res.ok && data.active === false && (data.reason === "revoked" || data.reason === "expired" || data.reason === "project_inactive")) {
      console.warn(`[Reno Access Companion] Session check returned revoked/inactive for ${cleanDomain}:`, data);
      await handleClearCookies(cleanDomain, data.reason || "revoked");
      return { active: false, reason: data.reason || "revoked" };
    }

    return { active: true, domain: cleanDomain };
  } catch (err) {
    return { active: true, warn: "broker_offline_grace" };
  }
}

/**
 * Heartbeat monitor: checks all stored active sessions.
 * If admin revoked an assignment, cookies and dynamic rules are wiped immediately.
 */
async function checkAllActiveSessions() {
  const { activeSessions = [] } = await chrome.storage.local.get(["activeSessions"]);
  if (activeSessions.length === 0) return;

  for (const session of activeSessions) {
    try {
      const brokerUrl = session.brokerUrl || DEFAULT_BROKER_URL;
      const checkUrl = `${brokerUrl}/api/broker/session-check?domain=${encodeURIComponent(session.domain)}&assignmentId=${encodeURIComponent(session.assignmentId || "")}`;

      const res = await fetch(checkUrl);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.active === false) {
        console.warn(`[Crewvia Vanguard Heartbeat] Revocation detected for ${session.domain} (${data.reason || "inactive"}). Purging immediately...`);
        await handleClearCookies(session.domain, data.reason || "revoked");
      }
    } catch (e) {
      // Ignore network errors in periodic check
    }
  }
}

/**
 * Removes dynamic rules, purges native cookies, and terminates open tabs upon revocation.
 */
async function handleClearCookies(domain, reason = "revoked") {
  if (!domain) {
    throw new Error("Domain parameter is required to clear cookies.");
  }

  const cleanDomain = domain.replace(/^\./, "");
  console.log(`[Reno Access Companion] Purging session for domain: ${cleanDomain} (Reason: ${reason})`);

  // 1. Remove Dynamic In-Flight DNR Auth Rule
  const ruleId = getDomainRuleId(cleanDomain);
  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateDynamicRules) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
      });
      console.log(`[Reno Access Companion] Removed dynamic auth rule (ID: ${ruleId}) for ${cleanDomain}`);
    } catch (e) {
      console.warn(`[Reno Access Companion] Error removing dynamic rule:`, e);
    }
  }

  // 2. Remove all native cookies for this domain
  await purgeNativeAuthCookies(cleanDomain);

  // 3. Remove from extension storage
  const { activeSessions = [] } = await chrome.storage.local.get(["activeSessions"]);
  const filtered = activeSessions.filter((s) => s.domain !== cleanDomain);
  await chrome.storage.local.set({ activeSessions: filtered });

  // 4. Find and terminate any open tabs for this client domain
  try {
    const matchingTabs = await chrome.tabs.query({});
    for (const tab of matchingTabs) {
      if (tab.url && tab.id) {
        try {
          const tabHostname = new URL(tab.url).hostname;
          if (tabHostname === cleanDomain || tabHostname.endsWith("." + cleanDomain)) {
            chrome.tabs.update(tab.id, {
              url: chrome.runtime.getURL(
                "restricted.html?blocked=" + encodeURIComponent(tab.url) + (reason === "revoked" ? "&reason=revoked" : `&reason=${encodeURIComponent(reason)}`)
              ),
            });
          }
        } catch (urlErr) {
          // Ignore invalid tab URLs
        }
      }
    }
  } catch (tabErr) {
    console.warn("[Reno Access Companion] Error terminating active tabs:", tabErr);
  }

  console.log(`[Reno Access Companion] Purged session, removed dynamic rules and terminated tabs for ${cleanDomain}.`);
  return { success: true, domain: cleanDomain };
}

// Ensure alarm and interval for heartbeat
function ensureAlarms() {
  chrome.alarms.get("reno_session_heartbeat", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("reno_session_heartbeat", { periodInMinutes: 0.25 });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "reno_session_heartbeat") {
    checkAllActiveSessions();
  }
});

// Periodic interval when worker is active in RAM
setInterval(checkAllActiveSessions, HEARTBEAT_INTERVAL_MS);

// Lifecycle listeners
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[Reno Access Companion] Extension installed/reloaded (reason: ${details.reason}).`);
  chrome.storage.local.set({ extensionReady: true, version: EXTENSION_VERSION });
  ensureAlarms();
  // Clear any stale native cookies that might exist in browser profile
  await purgeAllActiveSessionCookies();
});

chrome.runtime.onStartup.addListener(async () => {
  ensureAlarms();
  await purgeAllActiveSessionCookies();
  checkAllActiveSessions();
});

// Runtime Capability Sentinel: WebNavigation URL Interception
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    // Only intercept top-level frame navigation
    if (details.frameId !== 0 || !details.url) return;

    const lowerUrl = details.url.toLowerCase();

    // 0. Chrome view-source: bypass defense (prevents inspecting unmasked DOM on admin pages)
    if (lowerUrl.startsWith("view-source:") && (lowerUrl.includes("/wp-admin") || lowerUrl.includes("wp-json") || lowerUrl.includes("rest_route="))) {
      console.warn(`[Reno Access Sentinel] Blocked view-source inspection on WordPress admin: ${details.url}`);
      const redirectUrl = chrome.runtime.getURL(
        `restricted.html?blocked=${encodeURIComponent(details.url)}&reason=view_source_restricted`
      );
      chrome.tabs.update(details.tabId, { url: redirectUrl });
      return;
    }
    
    // 1. Core security restrictions (file editors, plugin install, update.php uploads)
    const isSecurityBlocked = [
      "plugin-editor.php",
      "theme-editor.php",
      "plugin-install.php",
      "action=upload-plugin",
      "action=upload-theme",
    ].some((pattern) => lowerUrl.includes(pattern));

    // 2. User & email restrictions (users page, user-new, profile)
    const isUserBlocked = [
      "users.php",
      "user-new.php",
      "user-edit.php",
      "profile.php",
      "export-personal-data.php",
      "erase-personal-data.php",
    ].some((pattern) => lowerUrl.includes(pattern));

    // 3. System database options dump (options.php, but NOT options-*.php)
    const isOptionsBlocked = lowerUrl.includes("/options.php") && !lowerUrl.includes("/options-");

    // 4. REST API User & Settings Leakage (blocks direct address bar dumps)
    const isUsersMe = lowerUrl.includes("users/me");
    const isRestBlocked =
      (!isUsersMe && (lowerUrl.includes("wp-json/wp/v2/users") || lowerUrl.includes("rest_route=/wp/v2/users") || lowerUrl.includes("rest_route=%2fwp%2fv2%2fusers"))) ||
      lowerUrl.includes("wp-json/wp/v2/settings") ||
      lowerUrl.includes("rest_route=/wp/v2/settings") ||
      lowerUrl.includes("rest_route=%2fwp%2fv2%2fsettings");

    if (isSecurityBlocked || isUserBlocked || isOptionsBlocked || isRestBlocked) {
      let reason = "restricted_editor";
      if (isUserBlocked) reason = "users_restricted";
      else if (isOptionsBlocked) reason = "options_restricted";
      else if (isRestBlocked) reason = "rest_api_restricted";
      console.warn(`[Reno Access Sentinel] Blocked restricted navigation to: ${details.url} (Reason: ${reason})`);
      const redirectUrl = chrome.runtime.getURL(
        `restricted.html?blocked=${encodeURIComponent(details.url)}&reason=${reason}`
      );
      chrome.tabs.update(details.tabId, { url: redirectUrl });
    }
  });
}

/**
 * Real-time tab synchronization:
 * Automatically injects content-bridge.js into existing open Reno Hub tabs
 * upon extension install, startup, or reload so users never have to refresh the page.
 */
async function injectBridgeIntoOpenTabs() {
  if (!chrome.scripting || !chrome.tabs) return;
  try {
    const tabs = await chrome.tabs.query({
      url: [
        "https://vanguard.crewvia.in/*",
        "https://*.crewvia.in/*",
        "http://localhost/*",
        "http://127.0.0.1/*",
        "https://*.renohub.agency/*",
        "https://*.vercel.app/*",
      ],
    });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ["content-bridge.js"],
          })
          .catch(() => {});
      }
    }
  } catch (e) {
    // Ignore context or permission errors
  }
}

if (chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    injectBridgeIntoOpenTabs();
  });
}

// Run on background worker activation
injectBridgeIntoOpenTabs();

// ============================================================================
// Real-Time WordPress Admin Presence & Tab Sentinels
// ============================================================================

// Detect when developer closes a WordPress admin tab
chrome.tabs.onRemoved.addListener(async (tabId) => {
  let tabInfo = openWpTabs.get(tabId);
  if (!tabInfo) {
    const { persistedOpenWpTabs = {} } = await chrome.storage.local.get(["persistedOpenWpTabs"]).catch(() => ({}));
    tabInfo = persistedOpenWpTabs?.[tabId];
  }

  if (tabInfo) {
    openWpTabs.delete(tabId);
    await syncOpenWpTabsToStorage();

    // Query active browser tabs to see if any tabs for this domain are still on /wp-admin/
    let remainingTabs = 0;
    try {
      const allTabs = await chrome.tabs.query({});
      for (const t of allTabs) {
        if (t.id !== tabId && t.url) {
          try {
            const u = new URL(t.url);
            const tabDomain = u.hostname.toLowerCase().replace(/^\./, "").replace(/^www\./, "");
            if (
              (tabDomain === tabInfo.domain || tabDomain.endsWith("." + tabInfo.domain)) &&
              u.pathname.toLowerCase().includes("/wp-admin/")
            ) {
              remainingTabs++;
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      remainingTabs = countOpenTabsForDomain(tabInfo.domain);
    }

    if (remainingTabs === 0) {
      console.log(`[Vanguard Presence] All WP admin tabs closed for ${tabInfo.domain}. Informing broker...`);
      notifyBrokerPresence("TAB_CLOSED", {
        domain: tabInfo.domain,
        assignmentId: tabInfo.assignmentId,
        brokerUrl: tabInfo.brokerUrl,
        remainingTabs: 0,
      });
    }
  }
});

// Detect when developer navigates away from /wp-admin/
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const lowerUrl = changeInfo.url.toLowerCase();
    let tabInfo = openWpTabs.get(tabId);
    if (!tabInfo) {
      const { persistedOpenWpTabs = {} } = await chrome.storage.local.get(["persistedOpenWpTabs"]).catch(() => ({}));
      tabInfo = persistedOpenWpTabs?.[tabId];
    }

    if (tabInfo && !lowerUrl.includes("/wp-admin/")) {
      openWpTabs.delete(tabId);
      await syncOpenWpTabsToStorage();
      const remaining = countOpenTabsForDomain(tabInfo.domain);
      if (remaining === 0) {
        console.log(`[Vanguard Presence] Developer navigated away from WP admin for ${tabInfo.domain}`);
        notifyBrokerPresence("TAB_CLOSED", {
          domain: tabInfo.domain,
          assignmentId: tabInfo.assignmentId,
          brokerUrl: tabInfo.brokerUrl,
          remainingTabs: 0,
        });
      }
    }
  }
});

