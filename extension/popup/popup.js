/**
 * Reno Access Companion - Popup UI Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  const sessionsList = document.getElementById("sessionsList");
  const sessionCount = document.getElementById("sessionCount");
  const emptyState = document.getElementById("emptyState");
  const btnOpenPortal = document.getElementById("btnOpenPortal");

  // Load and render active sessions
  loadSessions();

  // Open Vanguard Portal
  btnOpenPortal.addEventListener("click", () => {
    chrome.storage.local.get(["activeSessions"], (res) => {
      const sessions = res.activeSessions || [];
      const brokerUrl = (sessions[0]?.brokerUrl || "https://vanguard.crewvia.in").replace(/\/+$/, "");
      chrome.tabs.create({ url: `${brokerUrl}/developer` });
    });
  });

  function loadSessions() {
    chrome.storage.local.get(["activeSessions"], (res) => {
      const sessions = res.activeSessions || [];
      renderSessions(sessions);
    });
  }

  function renderSessions(sessions) {
    sessionCount.textContent = sessions.length.toString();

    if (sessions.length === 0) {
      sessionsList.innerHTML = "";
      sessionsList.appendChild(emptyState);
      emptyState.style.display = "flex";
      return;
    }

    sessionsList.innerHTML = "";

    sessions.forEach((session) => {
      const item = document.createElement("div");
      item.className = "session-item";

      const timeAgo = getTimeAgo(session.claimedAt);
      const roleName = formatRoleName(session.wpRoleTemplate);

      item.innerHTML = `
        <div class="session-top">
          <span class="session-domain">${escapeHtml(session.domain)}</span>
          <span class="session-role">${escapeHtml(roleName)}</span>
        </div>
        <div class="session-meta">
          <span>${session.cookieCount || 2} cookies injected</span>
          <span>Claimed ${timeAgo}</span>
        </div>
        <div class="session-actions">
          <button class="btn-open-tab" data-url="${escapeHtml(session.wpAdminUrl || `https://${session.domain}/wp-admin/`)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open WP Admin
          </button>
          <button class="btn-revoke" data-domain="${escapeHtml(session.domain)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
            Purge
          </button>
        </div>
      `;

      // Event listener to open tab
      const openBtn = item.querySelector(".btn-open-tab");
      openBtn.addEventListener("click", () => {
        const url = openBtn.getAttribute("data-url");
        if (url) {
          chrome.tabs.create({ url });
        }
      });

      // Event listener to purge cookies
      const revokeBtn = item.querySelector(".btn-revoke");
      revokeBtn.addEventListener("click", () => {
        const domain = revokeBtn.getAttribute("data-domain");
        if (domain) {
          revokeBtn.disabled = true;
          revokeBtn.textContent = "Purging...";

          chrome.runtime.sendMessage(
            { type: "CLEAR_COOKIES", domain },
            () => {
              loadSessions();
            }
          );
        }
      });

      sessionsList.appendChild(item);
    });
  }

  function formatRoleName(role) {
    if (!role) return "Restricted Admin";
    switch (role) {
      case "EDITOR":
        return "WP Editor";
      case "SHOP_MANAGER":
        return "Shop Manager";
      case "RESTRICTED_ADMIN":
        return "Restricted Admin";
      default:
        return role;
    }
  }

  function getTimeAgo(dateString) {
    if (!dateString) return "recently";
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
