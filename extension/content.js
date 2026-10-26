/**
 * Reno Access Companion - Runtime Capability Sentinel & Identity Masker Content Script
 *
 * Injected into client WordPress Admin dashboards (/wp-admin/) at document_start.
 * Enforces zero-trust capability restrictions by:
 * 1. Permanently locking and redirecting access away from Users & Profile pages.
 * 2. Blocking raw system options dump (options.php) while keeping options-general.php safely accessible.
 * 3. Scrubbing all email addresses from the DOM attributes and text nodes (DevTools Elements tab inspector proof).
 * 4. Sanitizing the top WordPress admin bar (masking "Howdy, [username]" to "Howdy, Developer (Zero-Trust)").
 * 5. Verifying active session validity with background worker (instant shutdown on admin revocation).
 * 6. Stripping File Editors and privilege escalation selects.
 */

(function () {
  const RESTRICTED_EDITOR_PAGES = [
    "plugin-editor.php",
    "theme-editor.php",
    "plugin-install.php",
    "action=upload-plugin",
    "action=upload-theme",
  ];

  const RESTRICTED_USER_PAGES = [
    "users.php",
    "user-new.php",
    "user-edit.php",
    "profile.php",
    "export-personal-data.php",
    "erase-personal-data.php",
  ];

  const currentUrl = window.location.href.toLowerCase();

  // 1. Immediate URL Guardrails (document_start)
  const isEditorRestricted = RESTRICTED_EDITOR_PAGES.some((s) => currentUrl.includes(s));
  const isUserRestricted = RESTRICTED_USER_PAGES.some((s) => currentUrl.includes(s));
  const isOptionsDumpRestricted = currentUrl.includes("/options.php") && !currentUrl.includes("/options-");

  if (isUserRestricted) {
    console.warn("[Reno Access Sentinel] Blocked access to User/Profile administration.");
    const alertUrl = chrome.runtime.getURL(
      `restricted.html?blocked=${encodeURIComponent(window.location.href)}&reason=users_restricted`
    );
    window.location.replace(alertUrl);
    return;
  }

  if (isOptionsDumpRestricted) {
    console.warn("[Reno Access Sentinel] Blocked access to raw system database options table.");
    const alertUrl = chrome.runtime.getURL(
      `restricted.html?blocked=${encodeURIComponent(window.location.href)}&reason=options_restricted`
    );
    window.location.replace(alertUrl);
    return;
  }

  if (isEditorRestricted) {
    console.warn("[Reno Access Sentinel] Blocked attempt to access restricted code editor endpoint.");
    const alertUrl = chrome.runtime.getURL(
      `restricted.html?blocked=${encodeURIComponent(window.location.href)}&reason=restricted_editor`
    );
    window.location.replace(alertUrl);
    return;
  }

  // 2. Immediate Session Verification with Background Worker
  // If the admin revoked access or the assignment expired, lock immediately.
  try {
    chrome.runtime.sendMessage(
      { type: "VERIFY_SESSION", domain: window.location.hostname },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log("[Reno Access Sentinel] Background check notice:", chrome.runtime.lastError.message);
          return;
        }

        // Only terminate if the session was explicitly marked as revoked or expired by agency owner
        if (response && response.active === false) {
          const reason = response.reason || "revoked";
          if (reason === "revoked" || reason === "expired" || reason === "project_inactive") {
            console.warn(`[Reno Access Sentinel] Session revoked or expired (${reason}). Terminating page view...`);
            document.documentElement.innerHTML = "";
            window.location.replace(chrome.runtime.getURL(`restricted.html?reason=${encodeURIComponent(reason)}`));
          } else {
            console.log(`[Reno Access Sentinel] Session status (${reason}). Guardrails active.`);
          }
        }
      }
    );
  } catch (err) {
    console.warn("[Reno Access Sentinel] Runtime communication error:", err);
  }

  // 3. Real-Time Active WordPress Presence Reporter
  // Only reports active while developer is genuinely on and interacting with wp-admin
  let lastUserActivity = Date.now();
  const registerActivity = () => {
    const wasIdle = Date.now() - lastUserActivity > 60000;
    lastUserActivity = Date.now();
    if (wasIdle && document.visibilityState === "visible") {
      reportActivePresence();
    }
  };

  window.addEventListener("mousemove", registerActivity, { passive: true });
  window.addEventListener("keydown", registerActivity, { passive: true });
  window.addEventListener("click", registerActivity, { passive: true });
  window.addEventListener("scroll", registerActivity, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      registerActivity();
      reportActivePresence();
    }
  });

  function reportActivePresence() {
    // Only report active if tab is visible and developer was active within the last 2 minutes
    if (document.visibilityState === "hidden") return;
    const isIdle = Date.now() - lastUserActivity > 120000;
    if (isIdle) return;

    try {
      chrome.runtime.sendMessage({
        type: "WP_ADMIN_ACTIVE",
        domain: window.location.hostname,
        url: window.location.href,
        path: window.location.pathname,
      });
    } catch (e) {}
  }

  // Report presence immediately on page load
  reportActivePresence();

  // Send periodic heartbeat every 20 seconds while developer is actively working
  const presenceInterval = setInterval(reportActivePresence, 20000);

  // When window/tab closes or navigates away, notify extension background immediately
  const handlePageUnload = () => {
    try {
      chrome.runtime.sendMessage({
        type: "WP_ADMIN_PAGE_UNLOAD",
        domain: window.location.hostname,
      });
    } catch (e) {}
  };

  window.addEventListener("pagehide", handlePageUnload);
  window.addEventListener("beforeunload", handlePageUnload);

  // 4. Early CSS Injection (runs at document_start to eliminate UI flicker / FOUC)
  function injectSentinelStyles() {
    if (document.getElementById("reno-sentinel-styles")) return;

    const style = document.createElement("style");
    style.id = "reno-sentinel-styles";
    style.textContent = `
      /* Lock & Hide Users and Profile Menus */
      #menu-users,
      #menu-users li,
      a[href*="users.php"],
      a[href*="user-new.php"],
      a[href*="user-edit.php"],
      a[href*="profile.php"],
      #wp-admin-bar-user-info,
      #wp-admin-bar-edit-profile,
      #wp-admin-bar-my-account .ab-sub-wrapper {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }

      /* Mask Admin Email Field on General Settings */
      input#admin_email,
      input#new_admin_email,
      input[name="admin_email"],
      input[name="new_admin_email"] {
        color: #64748b !important;
        background: #f1f5f9 !important;
        cursor: not-allowed !important;
        user-select: none !important;
        letter-spacing: 2px !important;
      }

      /* Disable profile click in admin bar */
      #wp-admin-bar-my-account > a.ab-item {
        pointer-events: none !important;
        cursor: default !important;
      }

      /* Hide Theme & Plugin File Editor Menus */
      #menu-plugins li:has(a[href*="plugin-editor.php"]),
      #menu-plugins li:has(a[href*="plugin-install.php"]),
      #menu-appearance li:has(a[href*="theme-editor.php"]),
      a[href*="plugin-editor.php"],
      a[href*="theme-editor.php"],
      a[href*="plugin-install.php"],
      .wrap a.page-title-action[href*="plugin-install.php"],
      .plugin-install-tab,
      .theme-install-tab,
      .upload-plugin,
      .upload-theme {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }

      /* Reno Hub Admin Top Bar Badge */
      #wp-admin-bar-reno-sentinel .ab-item {
        background: rgba(16, 185, 129, 0.15) !important;
        color: #34d399 !important;
        font-weight: 600 !important;
        border-radius: 4px;
        margin: 4px 6px;
        height: 24px !important;
        line-height: 24px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 0 8px !important;
        font-size: 11px !important;
      }
      #wp-admin-bar-reno-sentinel .ab-item:hover {
        background: rgba(16, 185, 129, 0.25) !important;
        color: #6ee7b7 !important;
      }
      .reno-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        background-color: #10b981;
        border-radius: 50%;
        box-shadow: 0 0 6px #10b981;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  injectSentinelStyles();

  // 4. Inject Main-World Script Fallback for Page Execution Prototype Defense
  try {
    const sentinelScript = document.createElement("script");
    sentinelScript.src = chrome.runtime.getURL("sentinel-main.js");
    sentinelScript.async = false;
    (document.head || document.documentElement).appendChild(sentinelScript);
    sentinelScript.onload = () => sentinelScript.remove();
  } catch (e) {}

  // 5. Email Masker & Identity Sanitizer
  const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const MASKED_EMAIL = "••••••••@••••.com";

  function isTargetEmailElement(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = (node.tagName || "").toLowerCase();
    if (tag !== "input" && tag !== "textarea") return false;
    const id = (node.id || "").toLowerCase();
    const name = (node.name || "").toLowerCase();
    const type = (node.type || "").toLowerCase();
    return (
      id === "admin_email" ||
      id === "new_admin_email" ||
      name === "admin_email" ||
      name === "new_admin_email" ||
      type === "email" ||
      id.includes("email") ||
      name.includes("email") ||
      (node.value && EMAIL_REGEX.test(node.value)) ||
      (node.getAttribute("value") && EMAIL_REGEX.test(node.getAttribute("value")))
    );
  }

  function maskEmailsInNode(node) {
    if (!node) return;

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();

      // Inline scripts containing configuration or user info
      if (tag === "script") {
        if (node.textContent && EMAIL_REGEX.test(node.textContent)) {
          node.textContent = node.textContent.replace(EMAIL_REGEX, MASKED_EMAIL);
        }
        return;
      }

      if (tag === "style") return;

      // Scrub all attributes of this element so DevTools Elements tab never displays raw email
      if (node.attributes) {
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          if (attr.name === "href" && attr.value && attr.value.toLowerCase().startsWith("mailto:")) {
            node.setAttribute("href", "javascript:void(0)");
            continue;
          }
          if (attr.value && EMAIL_REGEX.test(attr.value)) {
            node.setAttribute(attr.name, attr.value.replace(EMAIL_REGEX, MASKED_EMAIL));
          }
        }
      }

      // Explicitly overwrite DOM attribute node on input and textarea elements
      if (tag === "input" || tag === "textarea") {
        if (isTargetEmailElement(node)) {
          // Mutate the HTML attribute node so DevTools Elements tree renders the masked string
          node.setAttribute("value", MASKED_EMAIL);
          node.value = MASKED_EMAIL;
          node.defaultValue = MASKED_EMAIL;
          node.setAttribute("autocomplete", "off");
          node.setAttribute("readonly", "true");
          node.setAttribute("disabled", "true");
          if (node.hasAttribute("placeholder") && EMAIL_REGEX.test(node.getAttribute("placeholder"))) {
            node.setAttribute("placeholder", MASKED_EMAIL);
          }
        }
      }
    }

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue && EMAIL_REGEX.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(EMAIL_REGEX, MASKED_EMAIL);
      }
      return;
    }

    let child = node.firstChild;
    while (child) {
      maskEmailsInNode(child);
      child = child.nextSibling;
    }
  }

  function sanitizeAdminBar() {
    // Sanitize "Howdy, [username]" to "Howdy, Developer (Zero-Trust)"
    const accountEl = document.querySelector("#wp-admin-bar-my-account > a.ab-item");
    if (accountEl) {
      const displaySpan = accountEl.querySelector(".display-name");
      if (displaySpan) {
        displaySpan.textContent = "Developer (Zero-Trust)";
      } else {
        const textNodes = Array.from(accountEl.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE);
        for (const tn of textNodes) {
          if (tn.nodeValue && tn.nodeValue.includes("Howdy")) {
            tn.nodeValue = "Howdy, Developer (Zero-Trust)";
          }
        }
      }
    }

    // Remove user info dropdown
    const userInfo = document.getElementById("wp-admin-bar-user-info");
    if (userInfo) userInfo.remove();
    const editProfile = document.getElementById("wp-admin-bar-edit-profile");
    if (editProfile) editProfile.remove();
  }

  // 6. DOM Scrubbing & Privilege Escalation Blocker
  function scrubRestrictedElements() {
    // A. Strip editor, user, and dangerous escalation links
    const selectors = [
      '#menu-users',
      'a[href*="users.php"]',
      'a[href*="user-new.php"]',
      'a[href*="user-edit.php"]',
      'a[href*="profile.php"]',
      'a[href*="options.php"]:not([href*="options-"])',
      'a[href*="plugin-editor.php"]',
      'a[href*="theme-editor.php"]',
      'a[href*="plugin-install.php"]',
      '.page-title-action[href*="plugin-install.php"]',
      '.upload-plugin',
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const parentLi = el.closest("li");
        if (parentLi && parentLi.parentElement?.id?.includes("menu")) {
          parentLi.remove();
        } else {
          el.remove();
        }
      });
    });

    // B. Mask Admin Email inputs on General Settings (options-general.php) and anywhere in DOM
    const adminEmailInputs = document.querySelectorAll(
      'input#admin_email, input#new_admin_email, input[name="admin_email"], input[name="new_admin_email"], input[type="email"], input[id*="email" i], input[name*="email" i]'
    );
    adminEmailInputs.forEach((input) => {
      // Overwrite the DOM attribute value so DevTools Elements tab displays the masked value
      input.setAttribute("value", MASKED_EMAIL);
      input.value = MASKED_EMAIL;
      input.defaultValue = MASKED_EMAIL;
      input.setAttribute("autocomplete", "off");
      input.setAttribute("readonly", "true");
      input.setAttribute("disabled", "true");
      if (input.hasAttribute("placeholder") && EMAIL_REGEX.test(input.getAttribute("placeholder"))) {
        input.setAttribute("placeholder", MASKED_EMAIL);
      }
    });

    // C. Block Administrator Role Creation on user-new.php or user-edit.php if ever encountered
    const roleSelect = document.querySelector('select[name="role"], select#role');
    if (roleSelect) {
      const adminOption = roleSelect.querySelector('option[value="administrator"]');
      if (adminOption) {
        adminOption.disabled = true;
        adminOption.textContent += " (Locked by Agency Owner)";
        if (roleSelect.value === "administrator") {
          roleSelect.value = "editor";
        }
      }
    }
  }

  // 7. Inject Reno Hub Sentinel Status Badge into WordPress Top Bar
  function injectAdminBarBadge() {
    if (document.getElementById("wp-admin-bar-reno-sentinel")) return;

    const wpAdminBar =
      document.getElementById("wp-admin-bar-top-secondary") ||
      document.getElementById("wp-admin-bar-root-default");
    if (!wpAdminBar) return;

    const badgeLi = document.createElement("li");
    badgeLi.id = "wp-admin-bar-reno-sentinel";
    badgeLi.innerHTML = `
      <a class="ab-item" href="javascript:void(0)" title="Zero-Trust Access Broker governing this session">
        <span class="reno-dot"></span>
        <span>Crewvia Sentinel Active</span>
      </a>
    `;

    wpAdminBar.prepend(badgeLi);
  }

  // Complete cleanup pass
  function runFullScrub() {
    injectSentinelStyles();
    scrubRestrictedElements();
    sanitizeAdminBar();
    if (document.body) {
      maskEmailsInNode(document.body);
    }
    injectAdminBarBadge();
  }

  // Run scrubbing when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      runFullScrub();
    });
  } else {
    runFullScrub();
  }

  // Continuous observer with immediate synchronous interception on newly inserted nodes
  let debounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    // 1. Synchronously sanitize newly added elements before DevTools can inspect unmasked DOM
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      if (mutation.type === "childList") {
        for (let j = 0; j < mutation.addedNodes.length; j++) {
          const node = mutation.addedNodes[j];
          if (node.nodeType === Node.ELEMENT_NODE) {
            maskEmailsInNode(node);
          }
        }
      } else if (mutation.type === "attributes") {
        const target = mutation.target;
        if (target && target.nodeType === Node.ELEMENT_NODE) {
          const attrName = mutation.attributeName;
          if (attrName === "value" && (target.id === "new_admin_email" || target.id === "admin_email")) {
            if (target.getAttribute("value") !== MASKED_EMAIL) {
              target.setAttribute("value", MASKED_EMAIL);
            }
          }
        }
      }
    }

    // 2. Debounced full-pass scrub for structural changes
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runFullScrub();
    }, 150);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["value", "placeholder", "title", "href"],
  });

  console.log("[Reno Access Sentinel] Runtime Sentinel loaded & guarding WordPress dashboard.");
})();
