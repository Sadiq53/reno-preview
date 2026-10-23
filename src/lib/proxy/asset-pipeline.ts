/**
 * Reno Hub Reverse Proxy — Static Asset Classification & Caching Pipeline
 *
 * Classifies incoming proxy requests into asset categories and determines
 * optimal caching strategy, whether HTML rewriting is needed, and whether
 * to stream the response directly without buffering.
 */

import type { AssetClassification } from "./types";

/**
 * Classify a proxy request by its subpath and query string to determine
 * the optimal response strategy.
 *
 * @param subpath     - Clean subpath (e.g. `wp-content/themes/divi/style.css`)
 * @param queryString - Full query string including `?`
 */
export function classifyRequest(
  subpath: string,
  queryString: string
): AssetClassification {
  const fullPath = subpath + queryString;

  // ── Versioned assets: CSS/JS with ?ver= (WordPress cache busting) ──────
  if (/\.(css|js)\?.*ver=/i.test(fullPath)) {
    return {
      type: "static-versioned",
      cacheControl: "public, max-age=31536000, immutable",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── Fonts ─────────────────────────────────────────────────────────────
  if (/\.(woff2?|ttf|eot|otf)(\?.*)?$/i.test(subpath)) {
    return {
      type: "static-immutable",
      cacheControl: "public, max-age=31536000, immutable",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── Images and media ──────────────────────────────────────────────────
  if (/\.(png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|pdf|bmp|tiff?)(\?.*)?$/i.test(subpath)) {
    return {
      type: "static-immutable",
      cacheControl: "public, max-age=604800, stale-while-revalidate=86400",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── Static JS/CSS without version param ────────────────────────────────
  if (/\.(css|js)(\?.*)?$/i.test(subpath)) {
    return {
      type: "static-versioned",
      cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── WordPress bundled load-styles.php / load-scripts.php ──────────────
  if (subpath.includes("load-styles.php") || subpath.includes("load-scripts.php")) {
    return {
      type: "static-versioned",
      cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── Admin AJAX endpoint ────────────────────────────────────────────────
  if (subpath.includes("admin-ajax.php")) {
    return {
      type: "admin-ajax",
      cacheControl: "no-store, no-cache, must-revalidate",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── REST API / wp-json ────────────────────────────────────────────────
  if (subpath.startsWith("wp-json") || subpath.startsWith("wp-json/")) {
    return {
      type: "dynamic-api",
      cacheControl: "no-store, no-cache, must-revalidate",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── Map files (source maps) ────────────────────────────────────────────
  if (/\.map(\?.*)?$/i.test(subpath)) {
    return {
      type: "static-immutable",
      cacheControl: "public, max-age=604800",
      shouldRewrite: false,
      streamDirectly: true,
    };
  }

  // ── Everything else: HTML pages (wp-admin, frontend, builder views) ──
  return {
    type: "dynamic-html",
    cacheControl: "no-store",
    shouldRewrite: true,
    streamDirectly: false,
  };
}

/**
 * Detect if a query string contains a builder edit-mode flag.
 * When present, responses must NEVER be cached (nonces are embedded).
 */
export function isBuilderEditMode(queryString: string): boolean {
  const builderParams = [
    "et_fb=",         // Divi Visual Builder
    "elementor-preview=", // Elementor
    "fl_builder",     // Beaver Builder
    "vc_editable",    // WPBakery
    "ct_builder=",    // Oxygen Builder
    "bricks=",        // Bricks Builder
    "brizy-edit",     // Brizy
  ];
  const lower = queryString.toLowerCase();
  return builderParams.some((param) => lower.includes(param));
}
