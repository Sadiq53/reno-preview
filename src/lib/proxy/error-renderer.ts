/**
 * Reno Hub Reverse Proxy — Error Page Renderers
 *
 * Renders styled error pages for various proxy failure scenarios.
 * All pages use the Reno Hub dark theme for visual consistency.
 */

/**
 * Renders an error page when the upstream WordPress site is unreachable.
 */
export function renderProxyErrorHtml(
  projectName: string,
  targetUrl: string,
  errorMsg: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gateway Error - Reno Hub</title>
  <style>
    body { background: #090d16; color: #f1f5f9; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 28px; max-width: 480px; text-align: center; }
    h1 { font-size: 18px; margin-bottom: 8px; color: #f87171; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px; }
    code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #38bdf8; }
    .btn { display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 12px; }
    .btn:hover { background: #0369a1; }
  </style>
  <meta http-equiv="refresh" content="15">
</head>
<body>
  <div class="box">
    <h1>502 Bad Gateway</h1>
    <p>Reno Hub Reverse Proxy was unable to establish a connection to target site <code>${escapeHtml(projectName)}</code>.</p>
    <p style="font-size: 11px; color: #64748b;">Target: ${escapeHtml(targetUrl)}<br/>Details: ${escapeHtml(errorMsg)}</p>
    <p style="font-size: 11px; color: #475569;">This page will auto-refresh in 15 seconds.</p>
    <a href="javascript:location.reload()" class="btn">Retry Now</a>
  </div>
</body>
</html>`;
}

/**
 * Renders a page when the circuit breaker is OPEN for an origin.
 */
export function renderCircuitOpenHtml(
  projectName: string,
  retryAfterSeconds: number
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Service Unavailable - Reno Hub</title>
  <style>
    body { background: #090d16; color: #f1f5f9; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { background: #0f172a; border: 1px solid #f59e0b; border-radius: 12px; padding: 28px; max-width: 480px; text-align: center; box-shadow: 0 0 20px rgba(245, 158, 11, 0.15); }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h1 { font-size: 18px; margin-bottom: 8px; color: #fbbf24; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 16px; }
    .timer { font-size: 24px; font-weight: 700; color: #f59e0b; font-family: monospace; }
    .btn { display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 16px; }
  </style>
  <meta http-equiv="refresh" content="${retryAfterSeconds}">
</head>
<body>
  <div class="box">
    <div class="icon">⚡</div>
    <h1>Circuit Breaker Active</h1>
    <p>The WordPress site for <strong>${escapeHtml(projectName)}</strong> is temporarily unreachable. The circuit breaker has been triggered to protect system stability.</p>
    <div class="timer" id="countdown">${retryAfterSeconds}s</div>
    <p style="font-size: 11px; color: #64748b;">Auto-retrying when the circuit resets...</p>
    <a href="javascript:location.reload()" class="btn">Retry Now</a>
  </div>
  <script>
    var s = ${retryAfterSeconds};
    var el = document.getElementById("countdown");
    setInterval(function() { if (s > 0) { s--; el.textContent = s + "s"; } }, 1000);
  </script>
</body>
</html>`;
}

/**
 * Renders a page when WordPress credentials are not vaulted.
 */
export function renderCredentialsMissingHtml(
  projectName: string,
  projectId: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Credentials Required &mdash; Reno Hub</title>
  <style>
    body { background: #090d16; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .box { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 520px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .icon { width: 56px; height: 56px; margin: 0 auto 20px; background: rgba(225, 29, 72, 0.1); border: 1px solid rgba(225, 29, 72, 0.25); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #fff; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #e11d48, #be123c); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: 600; transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3); }
    .btn:hover { opacity: 0.95; }
    .note { margin-top: 20px; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">🔒</div>
    <h1>WordPress Master Credentials Required</h1>
    <p>The Agency Administrator has not yet vaulted the master WordPress credentials for <strong>${escapeHtml(projectName)}</strong>.<br/><br/>To enable zero-trust, passwordless reverse proxy login for assigned developers, please test and save the WordPress Admin credentials in Project Settings.</p>
    <a href="/admin/projects/${projectId}/settings" class="btn">Configure in Project Settings</a>
    <p class="note">Once configured in the vault, developers can launch WordPress Admin with 1-click and zero credentials disclosed.</p>
  </div>
</body>
</html>`;
}

/**
 * Renders simulated WordPress Admin for offline demo / development testing.
 */
export function renderMockWordPressAdmin(
  projectName: string,
  baseUrl: string,
  projectId: string,
  subpath: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dashboard &lsaquo; ${escapeHtml(projectName)} &mdash; WordPress</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif; background: #f0f0f1; color: #3c434a; }
    #wpadminbar { height: 32px; background: #1d2327; color: #fff; display: flex; align-items: center; padding: 0 16px; font-size: 13px; justify-content: space-between; }
    #adminmenuwrap { width: 160px; background: #1d2327; position: fixed; top: 32px; bottom: 0; left: 0; color: #fff; padding-top: 10px; }
    .menu-item { padding: 8px 16px; font-size: 13px; color: #c3c4c7; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .menu-item:hover, .menu-item.active { background: #2271b1; color: #fff; }
    #wpbody { margin-left: 180px; padding: 20px; }
    .card { background: #fff; border: 1px solid #c3c4c7; border-radius: 4px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 1px rgba(0,0,0,0.04); }
    h1 { font-size: 23px; font-weight: 400; margin: 0 0 16px 0; }
    .banner { background: #0f172a; color: #38bdf8; border-bottom: 2px solid #0284c7; padding: 8px 16px; font-size: 12px; display: flex; align-items: center; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="banner">
    <span>🔒 <strong>Reno Hub Access Broker</strong> &mdash; Reverse Proxy Gateway Active (Zero-Plugin Fallback)</span>
    <span style="color: #10b981;">● Authenticated Session Active</span>
  </div>
  <div id="wpadminbar">
    <span>${escapeHtml(projectName)} &rsaquo; WordPress Admin</span>
    <span>Logged in via Reno Hub</span>
  </div>
  <div id="adminmenuwrap">
    <div class="menu-item active">Dashboard</div>
    <div class="menu-item">Posts</div>
    <div class="menu-item">Media</div>
    <div class="menu-item">Pages</div>
    <div class="menu-item">Comments</div>
    <div class="menu-item">WooCommerce</div>
    <div class="menu-item">Settings</div>
  </div>
  <div id="wpbody">
    <h1>Dashboard</h1>
    <div class="card">
      <h2>Welcome to ${escapeHtml(projectName)}</h2>
      <p>This is the authenticated reverse proxy gateway view. All WordPress API requests, admin panels, and page edits are proxied securely through Reno Hub with zero plugins installed on the client site.</p>
      <p style="color: #64748b; font-size: 12px;">Active Subpath: <code>${escapeHtml(subpath)}</code> &bull; Base URL: <code>${escapeHtml(baseUrl)}</code></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
