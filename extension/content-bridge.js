/**
 * Crewvia Vanguard Companion - Content Bridge Script
 *
 * Injected into Vanguard Hub portal pages to establish a secure bidirectional bridge
 * between the web application (React/Next.js) and the extension service worker.
 */

(function () {
  const EXTENSION_VERSION = "1.0.0";

  // 1. Mark presence in DOM so React components can synchronously check installation
  try {
    document.documentElement.setAttribute("data-vanguard-extension-installed", EXTENSION_VERSION);
    document.documentElement.setAttribute("data-vanguard-extension-ready", "true");
    document.documentElement.setAttribute("data-reno-extension-installed", EXTENSION_VERSION);
    document.documentElement.setAttribute("data-reno-extension-ready", "true");
  } catch (e) {
    // Ignore context errors
  }

  // 2. Dispatch CustomEvent for React useEffect listeners
  try {
    window.dispatchEvent(
      new CustomEvent("vanguard-extension-ready", {
        detail: { installed: true, version: EXTENSION_VERSION },
      })
    );
    window.dispatchEvent(
      new CustomEvent("reno-extension-ready", {
        detail: { installed: true, version: EXTENSION_VERSION },
      })
    );
  } catch (e) {}

  // 3. Post Message for window listeners
  try {
    window.postMessage(
      {
        type: "VANGUARD_EXTENSION_READY",
        version: EXTENSION_VERSION,
        installed: true,
      },
      "*"
    );
    window.postMessage(
      {
        type: "RENO_EXTENSION_READY",
        version: EXTENSION_VERSION,
        installed: true,
      },
      "*"
    );
  } catch (e) {}

  // 4. Safe helper to send messages to background worker
  function sendToBackground(msg, onReply) {
    try {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        onReply({ success: false, error: "Extension runtime unavailable. Please reload extension." });
        return;
      }

      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          onReply({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        onReply(response || { success: true });
      });
    } catch (err) {
      onReply({
        success: false,
        error: "Extension was reloaded or context disconnected. Please refresh this page.",
      });
    }
  }

  // 5. Listen for commands from the Vanguard Hub Web Portal
  window.addEventListener("message", (event) => {
    // Security check: Only accept messages from current window and matching origin
    if (
      event.source !== window ||
      (event.origin && event.origin !== window.location.origin) ||
      !event.data ||
      typeof event.data.type !== "string"
    ) {
      return;
    }

    const { type, requestId } = event.data;

    // Ping check (Vanguard + Reno fallback)
    if (type === "VANGUARD_PING_EXTENSION" || type === "RENO_PING_EXTENSION") {
      window.postMessage(
        {
          type: "VANGUARD_PONG_EXTENSION",
          requestId,
          installed: true,
          version: EXTENSION_VERSION,
        },
        "*"
      );
      window.postMessage(
        {
          type: "RENO_PONG_EXTENSION",
          requestId,
          installed: true,
          version: EXTENSION_VERSION,
        },
        "*"
      );
      return;
    }

    // Check if valid session cookies already exist for a client domain
    if (type === "VANGUARD_CHECK_SESSION_STATUS" || type === "RENO_CHECK_SESSION_STATUS") {
      const { domain, targetUrl, assignmentId } = event.data;

      sendToBackground(
        {
          type: "CHECK_SESSION_COOKIES",
          domain,
          targetUrl,
          assignmentId,
        },
        (response) => {
          window.postMessage(
            {
              type: "VANGUARD_SESSION_STATUS_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
          window.postMessage(
            {
              type: "RENO_SESSION_STATUS_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
        }
      );
      return;
    }

    // Open or focus existing WordPress Admin panel directly (instant 0ms launch)
    if (type === "VANGUARD_OPEN_WP_ADMIN" || type === "RENO_OPEN_WP_ADMIN") {
      const { domain, targetUrl, wpAdminUrl } = event.data;

      sendToBackground(
        {
          type: "FOCUS_OR_OPEN_WP_TAB",
          domain,
          targetUrl,
          wpAdminUrl,
        },
        (response) => {
          window.postMessage(
            {
              type: "VANGUARD_OPEN_WP_ADMIN_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
          window.postMessage(
            {
              type: "RENO_OPEN_WP_ADMIN_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
        }
      );
      return;
    }

    // Launch WordPress Session (Full single-use grant claim)
    if (type === "VANGUARD_LAUNCH_WP_SESSION" || type === "RENO_LAUNCH_WP_SESSION") {
      const { grantToken, brokerUrl, targetUrl, assignmentId } = event.data;

      if (!grantToken) {
        window.postMessage(
          {
            type: "VANGUARD_LAUNCH_WP_RESPONSE",
            requestId,
            success: false,
            error: "Missing grantToken in launch request.",
          },
          "*"
        );
        window.postMessage(
          {
            type: "RENO_LAUNCH_WP_RESPONSE",
            requestId,
            success: false,
            error: "Missing grantToken in launch request.",
          },
          "*"
        );
        return;
      }

      sendToBackground(
        {
          type: "CLAIM_AND_LAUNCH_SESSION",
          grantToken,
          assignmentId,
          brokerUrl: brokerUrl || window.location.origin,
          targetUrl,
        },
        (response) => {
          window.postMessage(
            {
              type: "VANGUARD_LAUNCH_WP_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
          window.postMessage(
            {
              type: "RENO_LAUNCH_WP_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
        }
      );
      return;
    }

    // Revoke Session & Purge Cookies
    if (type === "VANGUARD_REVOKE_WP_SESSION" || type === "RENO_REVOKE_WP_SESSION") {
      const { domain } = event.data;

      sendToBackground(
        {
          type: "CLEAR_COOKIES",
          domain,
        },
        (response) => {
          window.postMessage(
            {
              type: "VANGUARD_REVOKE_WP_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
          window.postMessage(
            {
              type: "RENO_REVOKE_WP_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
        }
      );
      return;
    }

    // Force Nuclear Purge of Native Cookies
    if (type === "VANGUARD_PURGE_NATIVE_COOKIES" || type === "RENO_PURGE_NATIVE_COOKIES") {
      const { domain } = event.data;

      sendToBackground(
        {
          type: "PURGE_NATIVE_COOKIES",
          domain,
        },
        (response) => {
          window.postMessage(
            {
              type: "VANGUARD_PURGE_NATIVE_COOKIES_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
          window.postMessage(
            {
              type: "RENO_PURGE_NATIVE_COOKIES_RESPONSE",
              requestId,
              ...response,
            },
            "*"
          );
        }
      );
    }
  });

  console.log(`[Crewvia Vanguard Companion] Content bridge v${EXTENSION_VERSION} active.`);
})();
