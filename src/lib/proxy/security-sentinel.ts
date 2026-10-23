/**
 * Reno Hub Reverse Proxy — Security Sentinel
 *
 * Runtime Capability Sentinel that intercepts and blocks navigation to
 * restricted WordPress administrative endpoints (File Editor, Plugin Installer,
 * User Creator). Every blocked attempt is logged to the immutable AuditLog.
 *
 * ZERO-TRUST GUARANTEE: Developers assigned via Reno Hub CANNOT access
 * file editing, plugin installation, or administrator creation even if they
 * attempt to navigate directly to the URL.
 */

import { BLOCKED_SENTINEL_PATHS } from "./config";

/**
 * Checks whether the requested path is blocked by the Security Sentinel.
 *
 * @param fullRelativePath - Combined subpath + query string (e.g. `wp-admin/plugin-editor.php`)
 * @returns true if the path should be blocked
 */
export function isSentinelBlocked(fullRelativePath: string): boolean {
  const lower = fullRelativePath.toLowerCase();

  // 1. Raw options dump (options.php, but NOT options-general.php, options-writing.php, etc.)
  if (lower.includes("/options.php") && !lower.includes("/options-")) {
    return true;
  }

  // 2. REST API User & Settings Leakage (except current user preferences: users/me)
  const isUsersMe = lower.includes("users/me");
  if (
    (!isUsersMe && (lower.includes("wp-json/wp/v2/users") || lower.includes("rest_route=/wp/v2/users") || lower.includes("rest_route=%2fwp%2fv2%2fusers"))) ||
    lower.includes("wp-json/wp/v2/settings") ||
    lower.includes("rest_route=/wp/v2/settings") ||
    lower.includes("rest_route=%2fwp%2fv2%2fsettings")
  ) {
    return true;
  }

  // 3. Blocked capability paths
  return BLOCKED_SENTINEL_PATHS.some((blocked) =>
    lower.includes(blocked.toLowerCase())
  );
}

/**
 * Renders a sleek security alert page when a developer attempts to visit
 * a locked WordPress endpoint. Styled consistently with Reno Hub dark theme.
 */
export function renderSentinelBlockedHtml(blockedPath: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Restricted Area - Reno Hub Sentinel</title>
  <style>
    body {
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: #0f172a;
      border: 1px solid #ef4444;
      border-radius: 12px;
      padding: 32px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 0 30px rgba(239, 68, 68, 0.2);
    }
    .icon {
      width: 54px;
      height: 54px;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; margin-bottom: 8px; color: #ffffff; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
    .badge {
      display: inline-block;
      background: #1e293b;
      color: #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
    }
    .btn:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h1>Security Sentinel: Restricted Area</h1>
    <p>File editing, plugin installations, and administrative user creations are locked by your agency owner under Reno Hub zero-trust policy.</p>
    <div class="badge">Blocked Endpoint: ${blockedPath}</div>
    <div>
      <a href="javascript:history.back()" class="btn">Return to Safety</a>
    </div>
  </div>
</body>
</html>`;
}
