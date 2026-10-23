/**
 * Reno Hub Reverse Proxy — Builder Compatibility Engine
 *
 * Auto-detects which WordPress page builders are present in the HTML
 * and generates appropriate client-side JavaScript patches to ensure
 * they work correctly through the reverse proxy.
 *
 * Supported builders:
 * - Gutenberg (Block Editor) — wpApiSettings, wp.apiFetch
 * - Divi 5 — DiviAppFrameData, SafeURL, et_fb_options
 * - Elementor — elementorCommon.ajax, elementor.config
 * - WPBakery — vc_ namespaced variables, ajaxurl
 * - Beaver Builder — FLBuilder._ajaxUrl
 * - Oxygen Builder — oxygenVSB, ct_ endpoints
 * - Bricks Builder — bricksData
 */

import type { BuilderPatch } from "./types";

export const BUILDER_PATCHES: BuilderPatch[] = [
  // ── Gutenberg (Block Editor) — ~70% market share ──────────────────────
  {
    name: "Gutenberg",
    detect: (html) =>
      html.includes("wp-block-editor") ||
      html.includes("block-editor-page") ||
      html.includes("wp.apiFetch"),
    queryBypass: [],
    patchScript: (prefix) => `
      /* Gutenberg: wp.apiFetch reads wpApiSettings.root */
      /* Our base wpApiSettings interceptor handles core routing. */
      /* Additionally patch media upload sync for drag-drop uploads. */
      try {
        if (window.wp && wp.apiFetch) {
          var origApiFetch = wp.apiFetch;
          wp.apiFetch = function(options) {
            if (options && typeof options.path === "string") {
              if (options.path.startsWith("/wp-json/") || options.path.startsWith("/wp/v2/")) {
                if (!options.path.startsWith("${prefix}")) {
                  options.path = "${prefix}" + options.path;
                }
              }
            }
            return origApiFetch.apply(this, arguments);
          };
          // Preserve middleware chain
          Object.keys(origApiFetch).forEach(function(k) {
            if (typeof origApiFetch[k] !== "undefined") wp.apiFetch[k] = origApiFetch[k];
          });
        }
      } catch(e) { console.warn("[RenoCompat:Gutenberg]", e); }
    `,
  },

  // ── Divi 5 — ~8% market share ─────────────────────────────────────────
  {
    name: "Divi",
    detect: (html) =>
      html.includes("et_fb_options") ||
      html.includes("DiviAppFrameData") ||
      html.includes("ETBuilderBackend"),
    queryBypass: ["et_fb"],
    patchScript: (prefix) => `
      /* Divi: DiviAppFrameData normalization, et_fb_options patching */
      /* SafeURL is now in the core bridge (always injected) */

      try {
        var _dfd = window.DiviAppFrameData;
        if (_dfd && _dfd.iframeSrc && _dfd.iframeSrc.startsWith("/")) {
          _dfd.iframeSrc = window.location.origin + _dfd.iframeSrc;
        }
        Object.defineProperty(window, "DiviAppFrameData", {
          configurable: true, enumerable: true,
          get: function() { return _dfd; },
          set: function(val) {
            if (val && typeof val === "object") {
              if (val.iframeSrc && val.iframeSrc.startsWith("/")) {
                val.iframeSrc = window.location.origin + val.iframeSrc;
              }
              // Also fix editUrl, postUrl, and other URL fields Divi 5 uses
              ["editUrl", "postUrl", "adminUrl", "homeUrl", "siteUrl"].forEach(function(k) {
                if (val[k] && typeof val[k] === "string" && val[k].startsWith("/")) {
                  val[k] = window.location.origin + val[k];
                }
              });
            }
            _dfd = val;
          }
        });
      } catch(e) {}

      try {
        if (typeof et_fb_options !== "undefined" && et_fb_options) {
          et_fb_options.ajaxurl = "${prefix}/wp-admin/admin-ajax.php";
        }
      } catch(e) {}

      /* Divi 5: Intercept ETBuilderBackend for additional URL fields */
      try {
        var _etb = window.ETBuilderBackend;
        Object.defineProperty(window, "ETBuilderBackend", {
          configurable: true, enumerable: true,
          get: function() { return _etb; },
          set: function(val) {
            if (val && typeof val === "object") {
              if (val.ajaxUrl) val.ajaxUrl = "${prefix}/wp-admin/admin-ajax.php";
              if (val.et_account && val.et_account.et_api_url && val.et_account.et_api_url.startsWith("/")) {
                val.et_account.et_api_url = window.location.origin + val.et_account.et_api_url;
              }
            }
            _etb = val;
          }
        });
      } catch(e) {}
    `,
  },

  // ── Elementor — ~15% market share ─────────────────────────────────────
  {
    name: "Elementor",
    detect: (html) =>
      html.includes("elementor-") ||
      html.includes("elementorCommon") ||
      html.includes("elementor-app") ||
      html.includes("_elementor_edit_mode"),
    queryBypass: ["elementor-preview", "action=elementor"],
    patchScript: (prefix) => `
      /* Elementor: patch AJAX handler and config URLs */
      try {
        var _waitElm = setInterval(function() {
          if (window.elementorCommon && elementorCommon.ajax) {
            clearInterval(_waitElm);
            var origSend = elementorCommon.ajax.send;
            elementorCommon.ajax.send = function(action, options) {
              if (options && options.data && options.data.actions) {
                /* Elementor editor AJAX actions go through admin-ajax.php */
              }
              return origSend.apply(this, arguments);
            };
          }
          if (window.elementor && elementor.config) {
            if (elementor.config.home_url && !elementor.config.home_url.includes("${prefix}")) {
              elementor.config.home_url = window.location.origin + "${prefix}";
            }
          }
        }, 200);
        setTimeout(function() { clearInterval(_waitElm); }, 15000);
      } catch(e) { console.warn("[RenoCompat:Elementor]", e); }
    `,
  },

  // ── WPBakery — ~4% market share ───────────────────────────────────────
  {
    name: "WPBakery",
    detect: (html) =>
      html.includes("wpb_") ||
      html.includes("vc_") ||
      html.includes("js_composer"),
    queryBypass: ["vc_editable"],
    patchScript: (prefix) => `
      /* WPBakery: ensure ajaxurl and vc_ variables point through proxy */
      try {
        if (window.vc_post_id !== undefined) {
          window.ajaxurl = "${prefix}/wp-admin/admin-ajax.php";
        }
      } catch(e) { console.warn("[RenoCompat:WPBakery]", e); }
    `,
  },

  // ── Beaver Builder — ~1% market share ─────────────────────────────────
  {
    name: "Beaver Builder",
    detect: (html) =>
      html.includes("fl-builder") || html.includes("FLBuilder"),
    queryBypass: ["fl_builder"],
    patchScript: (prefix) => `
      /* Beaver Builder: patch FLBuilder AJAX URL */
      try {
        var _waitFL = setInterval(function() {
          if (window.FLBuilder && FLBuilder._ajaxUrl) {
            clearInterval(_waitFL);
            var origAjaxUrl = FLBuilder._ajaxUrl;
            FLBuilder._ajaxUrl = function() {
              return "${prefix}/wp-admin/admin-ajax.php";
            };
          }
        }, 200);
        setTimeout(function() { clearInterval(_waitFL); }, 10000);
      } catch(e) { console.warn("[RenoCompat:BeaverBuilder]", e); }
    `,
  },

  // ── Oxygen Builder — ~1% market share ──────────────────────────────────
  {
    name: "Oxygen",
    detect: (html) =>
      html.includes("ct_builder") ||
      html.includes("oxygenVSB") ||
      html.includes("oxygen-vsb"),
    queryBypass: ["ct_builder=", "action=ct_"],
    patchScript: (prefix) => `
      /* Oxygen: patch ct_ AJAX endpoints */
      try {
        if (window.defined_in_connector !== undefined || typeof ctAjaxUrl !== "undefined") {
          window.ajaxurl = "${prefix}/wp-admin/admin-ajax.php";
        }
      } catch(e) { console.warn("[RenoCompat:Oxygen]", e); }
    `,
  },

  // ── Bricks Builder ────────────────────────────────────────────────────
  {
    name: "Bricks",
    detect: (html) =>
      html.includes("bricks-") || html.includes("bricksData"),
    queryBypass: ["bricks="],
    patchScript: (prefix) => `
      /* Bricks: patch REST and AJAX endpoints */
      try {
        if (window.bricksData) {
          if (bricksData.restApiUrl && bricksData.restApiUrl.startsWith("/")) {
            bricksData.restApiUrl = window.location.origin + "${prefix}" + bricksData.restApiUrl;
          }
          if (bricksData.wpRestApiUrl && bricksData.wpRestApiUrl.startsWith("/")) {
            bricksData.wpRestApiUrl = window.location.origin + "${prefix}" + bricksData.wpRestApiUrl;
          }
        }
      } catch(e) { console.warn("[RenoCompat:Bricks]", e); }
    `,
  },
];

/**
 * Auto-detect builders present in the HTML snippet and return
 * combined JavaScript patches.
 *
 * @param htmlSnippet  - First chunk of HTML (we only need to scan enough to find builder markers)
 * @param proxyPrefix  - e.g. `/api/proxy/{projectId}`
 * @returns Combined JS string, or empty string if no builders detected
 */
export function generateBuilderPatches(
  htmlSnippet: string,
  proxyPrefix: string
): string {
  const detected = BUILDER_PATCHES.filter((patch) =>
    patch.detect(htmlSnippet)
  );

  if (detected.length === 0) return "";

  return detected
    .map(
      (patch) =>
        `/* === ${patch.name} Compatibility Patch === */\n${patch.patchScript(proxyPrefix)}`
    )
    .join("\n");
}

/**
 * Get the names of all detected builders (for logging/metrics).
 */
export function detectBuilders(htmlSnippet: string): string[] {
  return BUILDER_PATCHES
    .filter((patch) => patch.detect(htmlSnippet))
    .map((patch) => patch.name);
}
