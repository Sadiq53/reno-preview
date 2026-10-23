/**
 * Reno Hub Reverse Proxy — Redirect Handler
 *
 * Handles upstream HTTP redirects (301, 302, 303, 307, 308).
 * Internal redirects (same host) are followed transparently.
 * External redirects are rewritten to stay within the proxy prefix.
 */

import type { ProxyContext } from "./types";
import { MAX_INTERNAL_REDIRECTS } from "./config";

export interface RedirectResult {
  /** Whether to continue processing (redirect was followed internally) */
  followed: boolean;
  /** Final upstream response after following redirects */
  response: Response;
  /** Updated upstream URL (may change after internal redirects) */
  upstreamUrl: string;
  /** If the redirect should be returned to the client, the rewritten Location URL */
  clientRedirectUrl?: string;
  /** Original redirect status code (for client redirects) */
  redirectStatus?: number;
}

/**
 * Follow internal redirects transparently and rewrite external redirects
 * to stay within the proxy prefix.
 *
 * @param upstreamRes   - Initial upstream response
 * @param upstreamUrl   - The URL that was fetched
 * @param forwardHeaders - Headers to use for follow-up requests
 * @param ctx           - Proxy context
 * @param method        - HTTP method
 * @param bodyData      - Request body (for POST/PUT redirects)
 */
export async function handleRedirects(
  upstreamRes: Response,
  upstreamUrl: string,
  forwardHeaders: Headers,
  ctx: ProxyContext,
  method: string,
  bodyData: ArrayBuffer | undefined
): Promise<RedirectResult> {
  let currentRes = upstreamRes;
  let currentUrl = upstreamUrl;
  let redirectCount = 0;

  while (
    isRedirectStatus(currentRes.status) &&
    redirectCount < MAX_INTERNAL_REDIRECTS
  ) {
    const location = currentRes.headers.get("location");
    if (!location) break;

    let locUrl: URL;
    let upUrl: URL;
    try {
      locUrl = new URL(location, currentUrl);
      upUrl = new URL(currentUrl);
    } catch {
      break;
    }

    const isSameHost = locUrl.host === upUrl.host;

    // Check for trailing-slash normalization (e.g. /wp-admin → /wp-admin/)
    const isTrailingSlashNorm =
      isSameHost &&
      locUrl.pathname.replace(/\/+$/, "") ===
        upUrl.pathname.replace(/\/+$/, "");

    // Follow internal redirects transparently (but NOT wp-login.php redirects,
    // which indicate an auth failure)
    const shouldFollowInternally =
      isTrailingSlashNorm ||
      (isSameHost &&
        redirectCount < 2 &&
        !locUrl.pathname.includes("wp-login.php"));

    if (shouldFollowInternally) {
      redirectCount++;
      currentUrl = locUrl.toString();

      // POST→GET on 301/302/303 (per HTTP spec)
      const newMethod =
        method === "POST" && [301, 302, 303].includes(currentRes.status)
          ? "GET"
          : method;

      try {
        currentRes = await fetch(currentUrl, {
          method: newMethod,
          headers: forwardHeaders,
          body: ["GET", "HEAD"].includes(newMethod) ? undefined : bodyData,
          redirect: "manual",
        });
        continue;
      } catch (followErr) {
        console.warn("[PROXY_REDIRECT_FOLLOW_ERR]", followErr);
        break;
      }
    }

    // External redirect: rewrite Location to stay inside proxy
    let rewrittenLocation = location;
    if (location.startsWith(ctx.baseUrl)) {
      rewrittenLocation = location.replace(
        ctx.baseUrl,
        ctx.proxyPrefix
      );
    } else if (location.startsWith("/")) {
      rewrittenLocation = `${ctx.proxyPrefix}${location}`;
    }

    return {
      followed: false,
      response: currentRes,
      upstreamUrl: currentUrl,
      clientRedirectUrl: rewrittenLocation,
      redirectStatus: currentRes.status,
    };
  }

  return {
    followed: true,
    response: currentRes,
    upstreamUrl: currentUrl,
  };
}

function isRedirectStatus(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}
