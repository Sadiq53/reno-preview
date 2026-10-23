/**
 * Reno Hub Reverse Proxy — Client-Side Bridge Script & Injection Generator
 *
 * Generates the JavaScript bridge, Sentinel CSS, and proxy banner that are
 * injected into every proxied HTML page. The bridge intercepts client-side
 * XMLHttpRequest, fetch, and dynamic URL assignments to route them through
 * the Reno Hub proxy prefix.
 *
 * The bridge also activates builder-specific compatibility patches when
 * a known page builder is detected in the HTML.
 */

import { generateBuilderPatches } from "./builder-compat";
import { FEATURES } from "./config";

/**
 * Generates the core AJAX/fetch interceptor bridge script.
 *
 * This script is injected early in <head> before any WordPress JS executes.
 * It monkey-patches XMLHttpRequest.open and window.fetch to rewrite
 * root-relative WordPress URLs to the proxy prefix.
 */
export function generateBridgeScript(
  proxyPrefix: string,
  htmlSnippet: string
): string {
  // Generate builder-specific patches (only if feature is enabled and builders are detected)
  const builderPatches =
    FEATURES.builderCompat
      ? generateBuilderPatches(htmlSnippet, proxyPrefix)
      : "";

  return `
<script id="reno-ajax-bridge">
(function() {
  var proxyPrefix = "${proxyPrefix}";
  var proxyAjax = proxyPrefix + "/wp-admin/admin-ajax.php";
  window.ajaxurl = proxyAjax;

  // ── 0. SafeURL — Global URL constructor hardening ─────────────────────
  // Prevents 'TypeError: Failed to construct URL: Invalid URL' in ALL
  // proxied pages. Divi 5, Elementor, and WPBakery all construct URLs
  // dynamically and pass relative/malformed strings that break behind proxy.
  try {
    var OrigURL = window.URL;
    function SafeURL(url, base) {
      // Handle 0-arg calls
      if (arguments.length === 0) return new OrigURL(window.location.href);

      // Coerce to string
      var s = (url == null) ? "" : String(url);

      // Empty / whitespace-only → current page
      if (!s || !s.trim()) return new OrigURL(window.location.href);

      // Already absolute (http:, https:, blob:, data:, javascript:, about:)
      if (/^[a-zA-Z][a-zA-Z0-9+.\\-]*:/.test(s)) {
        try { return new OrigURL(s); }
        catch(e) { return new OrigURL(window.location.href); }
      }

      // Protocol-relative  //example.com/path
      if (s.startsWith("//")) {
        try { return new OrigURL(window.location.protocol + s); }
        catch(e) { return new OrigURL(window.location.href); }
      }

      // Explicit base provided
      if (base !== undefined && base !== null) {
        var bs = String(base);
        try { return new OrigURL(s, bs); }
        catch(e1) {
          try { return new OrigURL(s, window.location.origin); }
          catch(e2) { return new OrigURL(window.location.href); }
        }
      }

      // Root-relative → resolve against current origin
      if (s.charAt(0) === "/") {
        try { return new OrigURL(s, window.location.origin); }
        catch(e) { return new OrigURL(window.location.href); }
      }

      // Fragment-only or query-only
      if (s.charAt(0) === "#" || s.charAt(0) === "?") {
        try { return new OrigURL(s, window.location.href); }
        catch(e) { return new OrigURL(window.location.href); }
      }

      // Relative path → resolve against current page
      try { return new OrigURL(s, window.location.href); }
      catch(e1) {
        try { return new OrigURL(s, window.location.origin); }
        catch(e2) { return new OrigURL(window.location.href); }
      }
    }
    SafeURL.prototype = OrigURL.prototype;
    // Preserve static methods: createObjectURL, revokeObjectURL, canParse, parse
    Object.getOwnPropertyNames(OrigURL).forEach(function(k) {
      if (k !== "prototype" && k !== "length" && k !== "name") {
        try { SafeURL[k] = OrigURL[k]; } catch(e) {}
      }
    });
    try { Object.setPrototypeOf(SafeURL, OrigURL); } catch(e) {}
    window.URL = SafeURL;
  } catch(e) { console.warn("[Reno:SafeURL]", e); }

  // ── 1. wpApiSettings root normalization ───────────────────────────────
  var _wpApi = window.wpApiSettings;
  if (_wpApi && _wpApi.root && _wpApi.root.startsWith("/")) {
    _wpApi.root = window.location.origin + _wpApi.root;
  }
  try {
    Object.defineProperty(window, "wpApiSettings", {
      configurable: true, enumerable: true,
      get: function() { return _wpApi; },
      set: function(val) {
        if (val && typeof val === "object" && val.root && val.root.startsWith("/")) {
          val.root = window.location.origin + val.root;
        }
        _wpApi = val;
      }
    });
  } catch(e) {}

  // ── 2. XMLHttpRequest interception ────────────────────────────────────
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === "string") {
      if (url === "/wp-admin/admin-ajax.php" || url.startsWith("/wp-admin/admin-ajax.php?")) {
        url = proxyAjax + (url.indexOf("?") !== -1 ? url.substring(url.indexOf("?")) : "");
      } else if (
        url.startsWith("/wp-json/") ||
        url.startsWith("/wp-admin/") ||
        url.startsWith("/wp-content/") ||
        url.startsWith("/wp-includes/")
      ) {
        url = proxyPrefix + url;
      }
    }
    return origOpen.apply(this, arguments);
  };

  // ── 3. fetch() interception ───────────────────────────────────────────
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === "string") {
      if (input === "/wp-admin/admin-ajax.php" || input.startsWith("/wp-admin/admin-ajax.php?")) {
        input = proxyAjax + (input.indexOf("?") !== -1 ? input.substring(input.indexOf("?")) : "");
      } else if (
        input.startsWith("/wp-json/") ||
        input.startsWith("/wp-admin/") ||
        input.startsWith("/wp-content/") ||
        input.startsWith("/wp-includes/")
      ) {
        input = proxyPrefix + input;
      }
    }
    return origFetch.apply(this, arguments);
  };

  // ── 4. Nested iframe detection (suppress proxy banner in builder frames) ──
  if (window.self !== window.top) {
    document.documentElement.classList.add("reno-is-framed");
  }

  // ── 5. Builder-specific patches ───────────────────────────────────────
  ${builderPatches}
})();
</script>
`;
}

/**
 * Generates the Sentinel CSS that hides file editor menus,
 * plugin installer links, and the proxy banner inside nested iframes.
 */
export function generateSentinelCSS(): string {
  return `
<style id="reno-sentinel-styles">
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

  /* Hide Theme & Plugin File Editor & Install Menus */
  #menu-plugins li:has(a[href*="plugin-editor.php"]),
  #menu-plugins li:has(a[href*="plugin-install.php"]),
  #menu-appearance li:has(a[href*="theme-editor.php"]),
  a[href*="plugin-editor.php"],
  a[href*="theme-editor.php"],
  a[href*="plugin-install.php"],
  .wrap a.page-title-action[href*="plugin-install.php"],
  .upload-plugin,
  .upload-theme {
    display: none !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
  /* Suppress proxy banner inside nested builder iframes */
  html.reno-is-framed #reno-proxy-banner,
  html.et-vb-top-window-html #reno-proxy-banner {
    display: none !important;
  }
</style>
`;
}

/**
 * Generates the top banner that indicates the page is being served
 * through the Reno Hub Access Broker.
 */
export function generateProxyBanner(): string {
  return `
<div id="reno-proxy-banner" style="position: sticky; top: 0; z-index: 999999; background: #0f172a; color: #38bdf8; border-bottom: 1px solid #0284c7; padding: 6px 14px; font-family: -apple-system, sans-serif; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
  <span style="display: flex; align-items: center; gap: 8px;">
    <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></span>
    <strong>Reno Hub Access Broker</strong> — Authenticated Reverse Proxy Gateway (Fallback Mode)
  </span>
  <span style="font-size: 11px; color: #94a3b8;">Runtime Capability Sentinel Active</span>
</div>
`;
}

/**
 * Generates the <base> tag that resolves relative URLs correctly.
 *
 * - Inside wp-admin: base href = `/api/proxy/{id}/wp-admin/`
 * - Frontend pages: base href = `/api/proxy/{id}/`
 */
export function generateBaseTag(
  proxyPrefix: string,
  isInAdmin: boolean
): string {
  return isInAdmin
    ? `<base href="${proxyPrefix}/wp-admin/">`
    : `<base href="${proxyPrefix}/">`;
}
