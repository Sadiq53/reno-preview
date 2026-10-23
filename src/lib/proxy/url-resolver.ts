/**
 * Reno Hub Reverse Proxy — URL Resolver & Subpath Classifier
 *
 * Normalizes incoming proxy URLs into upstream WordPress URLs.
 * Handles: trailing slash enforcement, wp-admin auto-prefixing,
 * root query parameter routing, and permalink normalization.
 */

/**
 * Resolves the upstream subpath and query string from the incoming proxy request.
 *
 * @param pathSegments - URL path segments after `/api/proxy/{id}/`
 * @param queryString  - Full query string including `?`
 * @returns Normalized subpath ready for upstream URL construction
 */
export function resolveSubpath(
  pathSegments: string[] | undefined,
  queryString: string
): string {
  const filteredSegments = (pathSegments || []).filter(Boolean);

  if (filteredSegments.length > 0) {
    return filteredSegments.join("/");
  }

  if (!queryString) {
    // Default entry point for 1-click login → wp-admin/
    return "wp-admin/";
  }

  // Root query parameter requests (e.g. ?page_id=2660&et_fb=1) → site root
  return "";
}

/**
 * Cleans and normalizes a subpath for upstream WordPress fetching.
 *
 * Handles:
 * - Leading slash removal
 * - wp-admin trailing slash enforcement (WordPress requires it)
 * - Auto-prefixing bare .php files to wp-admin/
 * - Permalink trailing slash enforcement
 *
 * @param rawSubpath - Subpath from resolveSubpath()
 * @returns Normalized subpath safe for upstream URL construction
 */
export function normalizeSubpath(rawSubpath: string): string {
  let subpath = rawSubpath.startsWith("/") ? rawSubpath.substring(1) : rawSubpath;

  // WordPress requires trailing slash on wp-admin directory endpoint
  if (subpath === "wp-admin" || subpath.endsWith("/wp-admin")) {
    subpath = `${subpath.replace(/\/+$/, "")}/`;
  }

  // Auto-prefix admin PHP files that were requested without wp-admin/
  const isWpAdminFile =
    subpath.endsWith(".php") &&
    !subpath.startsWith("wp-admin/") &&
    !subpath.startsWith("wp-includes/") &&
    !subpath.startsWith("wp-content/") &&
    subpath !== "wp-login.php" &&
    subpath !== "index.php" &&
    subpath !== "wp-cron.php" &&
    subpath !== "xmlrpc.php";

  if (isWpAdminFile) {
    subpath = `wp-admin/${subpath}`;
  }

  // WordPress permalinks (non-file routes like /about-us) need trailing slash
  const isStaticFileOrApi =
    subpath.includes(".") ||
    subpath.startsWith("wp-json") ||
    subpath === "" ||
    subpath.endsWith("/");

  if (!isStaticFileOrApi) {
    subpath = `${subpath}/`;
  }

  return subpath;
}

/**
 * Constructs the full upstream URL from base URL, subpath, and query string.
 */
export function buildUpstreamUrl(
  baseUrl: string,
  cleanSubpath: string,
  queryString: string
): string {
  return `${baseUrl}/${cleanSubpath}${queryString}`;
}

/**
 * Determines whether the resolved subpath is inside the wp-admin directory.
 */
export function isAdminPath(cleanSubpath: string): boolean {
  return cleanSubpath.startsWith("wp-admin");
}
