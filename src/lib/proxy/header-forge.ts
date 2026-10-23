/**
 * Reno Hub Reverse Proxy — Request/Response Header Transformation Engine
 *
 * Forges correct request headers so WordPress sees a legitimate browser request,
 * and strips/transforms response headers so the proxy works within Reno Hub.
 *
 * Critical for: CORS validation, nonce verification, WAF bypass, and builder compatibility.
 */

import type { NextRequest } from "next/server";
import type { AssetClassification } from "./types";
import { HOP_BY_HOP_HEADERS, COMPATIBLE_USER_AGENTS, PASSTHROUGH_RESPONSE_HEADERS } from "./config";

/**
 * Build headers to send to the upstream WordPress server.
 *
 * @param req            - Incoming Next.js request
 * @param baseUrl        - Upstream WordPress base URL (e.g. `https://client.com`)
 * @param projectId      - Project UUID
 * @param isHtmlRequest  - Whether this is expected to return HTML (triggers Accept-Encoding: identity)
 * @param cookieHeader   - Authenticated WP session cookie string
 */
export function forgeRequestHeaders(
  req: NextRequest,
  baseUrl: string,
  projectId: string,
  isHtmlRequest: boolean,
  cookieHeader: string
): Headers {
  const headers = new Headers();

  // Forward all client headers except hop-by-hop and cookie
  req.headers.forEach((val, key) => {
    const lower = key.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lower) && lower !== "cookie") {
      headers.set(key, val);
    }
  });

  // Authenticated session cookie
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  // Use compatible browser UA to pass WAF TLS fingerprint checks
  headers.set("User-Agent", COMPATIBLE_USER_AGENTS[0]);

  // Origin must match target site for WordPress CORS / nonce validation
  headers.set("Origin", baseUrl);

  // Translate Referer from proxy URL to upstream URL
  headers.set("Referer", translateReferer(req, projectId, baseUrl));

  // Force uncompressed responses for HTML (so TransformStream can rewrite text)
  // Static assets pass through compressed to save bandwidth
  if (isHtmlRequest) {
    headers.set("Accept-Encoding", "identity");
  }

  // X-Forwarded headers for WordPress to detect correct scheme/host
  headers.set(
    "X-Forwarded-For",
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1"
  );
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Host", new URL(baseUrl).host);

  return headers;
}

/**
 * Translate a Reno Hub proxy Referer to the corresponding upstream URL.
 * WordPress uses Referer for nonce validation (wp_check_admin_referer).
 */
function translateReferer(
  req: NextRequest,
  projectId: string,
  baseUrl: string
): string {
  const clientReferer = req.headers.get("referer");
  if (!clientReferer) return `${baseUrl}/wp-admin/`;

  try {
    const refUrl = new URL(clientReferer);
    const proxyPrefix = `/api/proxy/${projectId}`;

    if (refUrl.pathname.startsWith(proxyPrefix)) {
      const upstreamPath = refUrl.pathname.slice(proxyPrefix.length) || "/";
      return `${baseUrl}${upstreamPath}${refUrl.search}`;
    }
  } catch {
    // Malformed referer — use safe default
  }

  return `${baseUrl}/wp-admin/`;
}

/**
 * Build response headers to send back to the client browser.
 *
 * Strips framing protection headers (X-Frame-Options, CSP) so the proxied
 * WordPress content can be embedded inside Reno Hub's preview window.
 */
export function forgeResponseHeaders(
  upstreamHeaders: Headers,
  classification: AssetClassification
): Headers {
  const headers = new Headers();

  // Copy select upstream headers that are safe and useful
  for (const key of PASSTHROUGH_RESPONSE_HEADERS) {
    const val = upstreamHeaders.get(key);
    if (val) headers.set(key, val);
  }

  // Set cache control based on asset classification
  headers.set("Cache-Control", classification.cacheControl);

  // DO NOT copy x-frame-options or content-security-policy
  // (we need to embed WordPress content in Reno Hub preview iframes)

  // Allow CORS for proxy assets
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "X-WP-Nonce, X-ET-Nonce, Content-Type");

  // Explicitly ensure compression, length, and framing headers are NEVER passed through
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  return headers;
}
