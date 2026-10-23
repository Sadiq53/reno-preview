(function () {
  const params = new URLSearchParams(window.location.search);
  const blocked = params.get("blocked");
  const reason = params.get("reason") || "default";

  const titleEl = document.getElementById("sentinelTitle");
  const descEl = document.getElementById("sentinelDesc");
  const blockedUrlEl = document.getElementById("blockedUrl");
  const blockedBadgeEl = document.getElementById("blockedUrlDisplay");
  const btnReturn = document.getElementById("btnReturn");
  const btnReturnText = document.getElementById("btnReturnText");
  const iconWrap = document.getElementById("iconWrap");

  if (reason === "users_restricted") {
    if (titleEl) titleEl.textContent = "Security Sentinel: Users & Profile Locked";
    if (descEl) descEl.textContent = "Access to user directories, client email addresses, and personal profile modification is locked under Crewvia Vanguard Zero-Trust policy to protect client privacy.";
    if (btnReturnText) btnReturnText.textContent = "Return to Safe Dashboard";
  } else if (reason === "options_restricted") {
    if (titleEl) titleEl.textContent = "Security Sentinel: System Options Locked";
    if (descEl) descEl.textContent = "Access to the raw system database options table is restricted under Crewvia Vanguard Zero-Trust policy to prevent credential and database leakage.";
    if (btnReturnText) btnReturnText.textContent = "Return to Safe Dashboard";
  } else if (reason === "revoked" || reason === "expired") {
    if (titleEl) titleEl.textContent = "Session Terminated: Access Revoked";
    if (descEl) descEl.textContent = "Your access to this client website has been revoked or has expired. All authenticated WordPress session cookies have been immediately wiped from your browser.";
    if (btnReturnText) btnReturnText.textContent = "Return to Crewvia Vanguard Portal";
    if (iconWrap) iconWrap.style.background = "#FEE2E2";
  }

  if (blocked) {
    try {
      const parsed = new URL(blocked);
      if (blockedUrlEl) blockedUrlEl.textContent = parsed.pathname + parsed.search;
    } catch (e) {
      if (blockedUrlEl) blockedUrlEl.textContent = blocked;
    }
  } else {
    if (reason === "revoked") {
      if (blockedBadgeEl) blockedBadgeEl.innerHTML = "Status: <code>Access Revoked by Administrator</code>";
    } else {
      if (blockedBadgeEl) blockedBadgeEl.style.display = "none";
    }
  }

  if (btnReturn) {
    btnReturn.addEventListener("click", () => {
      if (reason === "revoked" || reason === "expired") {
        const brokerUrl = params.get("broker") || "https://vanguard.crewvia.in";
        window.location.href = `${brokerUrl.replace(/\/+$/, "")}/developer`;
        return;
      }

      if (blocked) {
        try {
          const parsed = new URL(blocked);
          window.location.href = parsed.origin + "/wp-admin/index.php";
          return;
        } catch (e) {}
      }
      history.back();
    });
  }
})();
