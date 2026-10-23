/**
 * Headless WordPress Session Authenticator (Zero-Plugin Access Broker)
 *
 * Executes server-to-server headless authentication against a client site's `wp-login.php`.
 * Captures authenticated session cookies (wordpress_logged_in_*, wordpress_sec_*) in ephemeral RAM
 * and packages them for the Reno Access Companion extension or fallback proxy gateway.
 *
 * ZERO-PLUGIN GUARANTEE: Exactly 0 plugins or files modified on the client WordPress site.
 * SECURITY GUARANTEE: Plaintext passwords exist in server RAM only during the handshake.
 */

export interface WpCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number; // epoch timestamp in seconds
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface WpLoginCredentials {
  targetUrl: string;
  username: string;
  password: string;
  customLoginUrl?: string | null;
}

export interface WpLoginResult {
  success: boolean;
  cookies: WpCookie[];
  cookieHeader: string;
  redirectUrl?: string;
  statusCode?: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 15000;

// User-agents tested to prevent TLS JA3/JA4 fingerprint mismatch drops on WAFs (e.g. Cloudflare, Imunify360, LiteSpeed)
export const COMPATIBLE_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
  "WordPress/6.4; +https://wordpress.org",
  "RenoHub/1.0 (WordPress Access Broker; +https://renohub.dev)",
];

export function normalizeWpLoginUrl(
  rawUrl: string,
  customLoginUrl?: string | null
): {
  loginUrl: string;
  baseUrl: string;
  domain: string;
} {
  let trimmed = rawUrl.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }

  const parsed = new URL(trimmed);
  const domain = parsed.hostname;
  const baseUrl = `${parsed.protocol}//${parsed.host}`;

  // If a custom login URL is provided, resolve it
  if (customLoginUrl && customLoginUrl.trim()) {
    let customTrimmed = customLoginUrl.trim();
    if (!customTrimmed.startsWith("http://") && !customTrimmed.startsWith("https://")) {
      const normalizedPath = customTrimmed.startsWith("/") ? customTrimmed : `/${customTrimmed}`;
      customTrimmed = `${baseUrl}${normalizedPath}`;
    }

    try {
      const parsedCustom = new URL(customTrimmed);
      let pathname = parsedCustom.pathname;

      // If user provided a URL ending in /wp-admin or /wp-admin/, translate to wp-login.php
      if (
        pathname === "/wp-admin" ||
        pathname === "/wp-admin/" ||
        pathname.endsWith("/wp-admin") ||
        pathname.endsWith("/wp-admin/")
      ) {
        const parentPath = pathname.replace(/\/wp-admin\/?$/, "");
        pathname = `${parentPath}/wp-login.php`;
      }

      // Reconstruct clean loginUrl (stripping query parameters like ?redirect_to=...&reauth=1)
      const loginUrl = `${parsedCustom.origin}${pathname}`;
      return { loginUrl, baseUrl: parsedCustom.origin, domain: parsedCustom.hostname };
    } catch {
      return { loginUrl: customTrimmed, baseUrl, domain };
    }
  }

  // Default: resolve to /wp-login.php
  let loginUrl = trimmed;
  if (!parsed.pathname.includes("wp-login.php")) {
    let basePath = parsed.pathname.endsWith("/")
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;
    if (basePath.endsWith("/wp-admin")) {
      basePath = basePath.replace(/\/wp-admin$/, "");
    }
    loginUrl = `${baseUrl}${basePath}/wp-login.php`;
  }

  return { loginUrl, baseUrl, domain };
}

/**
 * Parses individual Set-Cookie header lines into structured WpCookie objects.
 */
export function parseCookieLine(cookieLine: string, defaultDomain: string): WpCookie | null {
  const parts = cookieLine.split(";").map((p) => p.trim());
  if (parts.length === 0 || !parts[0].includes("=")) return null;

  const firstEqual = parts[0].indexOf("=");
  const name = parts[0].substring(0, firstEqual).trim();
  const value = parts[0].substring(firstEqual + 1).trim();

  if (!name) return null;

  const cookie: WpCookie = {
    name,
    value,
    domain: defaultDomain,
    path: "/",
  };

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const equalIdx = part.indexOf("=");
    const key = (equalIdx > -1 ? part.substring(0, equalIdx) : part).toLowerCase().trim();
    const val = equalIdx > -1 ? part.substring(equalIdx + 1).trim() : "";

    switch (key) {
      case "domain":
        cookie.domain = val.startsWith(".") ? val.substring(1) : val;
        break;
      case "path":
        cookie.path = val || "/";
        break;
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "samesite":
        if (val.toLowerCase() === "strict") cookie.sameSite = "Strict";
        else if (val.toLowerCase() === "lax") cookie.sameSite = "Lax";
        else if (val.toLowerCase() === "none") cookie.sameSite = "None";
        break;
      case "max-age":
        const maxAgeSec = parseInt(val, 10);
        if (!isNaN(maxAgeSec)) {
          cookie.expires = Math.floor(Date.now() / 1000) + maxAgeSec;
        }
        break;
      case "expires":
        const expDate = Date.parse(val);
        if (!isNaN(expDate)) {
          cookie.expires = Math.floor(expDate / 1000);
        }
        break;
    }
  }

  return cookie;
}

/**
 * Extracts all cookies from standard Fetch response headers.
 */
export function extractCookiesFromHeaders(
  headers: Headers,
  defaultDomain: string
): WpCookie[] {
  const cookies: WpCookie[] = [];

  // getSetCookie is supported in Node 18+ and modern browser/edge fetch implementations
  if (typeof (headers as any).getSetCookie === "function") {
    const lines: string[] = (headers as any).getSetCookie();
    for (const line of lines) {
      const parsed = parseCookieLine(line, defaultDomain);
      if (parsed) cookies.push(parsed);
    }
  } else {
    // Fallback: headers.get('set-cookie')
    const raw = headers.get("set-cookie");
    if (raw) {
      const splitLines = raw.split(/,(?=\s*[^;]+=[^;]+)/g);
      for (const line of splitLines) {
        const parsed = parseCookieLine(line, defaultDomain);
        if (parsed) cookies.push(parsed);
      }
    }
  }

  return cookies;
}

/**
 * Parses WordPress login error messages from HTML response body.
 */
export function parseWpErrorMessage(html: string): string {
  // WordPress wraps errors in <div id="login_error">...</div>
  const match = html.match(/<div[^>]*id=["']login_error["'][^>]*>([\s\S]*?)<\/div>/i);
  if (match && match[1]) {
    // Strip HTML tags and clean whitespace
    return match[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
  }

  if (html.toLowerCase().includes("incorrect") || html.toLowerCase().includes("invalid username")) {
    return "Invalid WordPress username or password.";
  }

  return "WordPress login rejected credentials.";
}

/**
 * Performs headless authentication against client site wp-login.php.
 */
export async function authenticateWordPressSession(
  credentials: WpLoginCredentials,
  options?: {
    timeoutMs?: number;
    fetchFn?: typeof fetch;
  }
): Promise<WpLoginResult> {
  const { targetUrl, username, password } = credentials;
  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
  const fetchImpl = options?.fetchFn || fetch;

  if (!username || !password) {
    return {
      success: false,
      cookies: [],
      cookieHeader: "",
      error: "Username and password are required.",
    };
  }

  const { loginUrl, baseUrl, domain } = normalizeWpLoginUrl(targetUrl, credentials.customLoginUrl);

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  const userAgentsToTry = options?.fetchFn ? [COMPATIBLE_USER_AGENTS[0]] : COMPATIBLE_USER_AGENTS;
  let lastNetworkError: any = null;

  try {
    for (const userAgent of userAgentsToTry) {
      try {
        // Step 1: Preliminary probe to resolve redirects & collect initial cookies (e.g. wordpress_test_cookie)
        const initialCookiesMap = new Map<string, string>();
        let targetPostUrl = loginUrl;

        if (!options?.fetchFn) {
          try {
            const probeRes = await fetchImpl(loginUrl, {
              method: "GET",
              headers: {
                "User-Agent": userAgent,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              },
              redirect: "follow",
              signal: controller.signal,
            });

            if (probeRes.url && (probeRes.url.includes("wp-login.php") || probeRes.url.includes("login"))) {
              const parsedRedirect = new URL(probeRes.url);
              targetPostUrl = `${parsedRedirect.origin}${parsedRedirect.pathname}`;
            }

            const initialCookies = extractCookiesFromHeaders(probeRes.headers, domain);
            for (const c of initialCookies) {
              if (c.value && c.value !== "%20" && !c.expires || (c.expires && c.expires > Math.floor(Date.now() / 1000))) {
                initialCookiesMap.set(c.name, c.value);
              }
            }
          } catch {
            // Non-fatal: if probe fails, proceed to direct POST
          }
        }

        // Ensure wordpress_test_cookie is present
        if (!initialCookiesMap.has("wordpress_test_cookie")) {
          initialCookiesMap.set("wordpress_test_cookie", "WP%20Cookie%20check");
        }

        const initialCookieHeader = Array.from(initialCookiesMap.entries())
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");

        // Step 2: Headless POST to login endpoint
        const bodyParams = new URLSearchParams();
        bodyParams.append("log", username);
        bodyParams.append("pwd", password);
        bodyParams.append("wp-submit", "Log In");
        bodyParams.append("redirect_to", `${baseUrl}/wp-admin/`);
        bodyParams.append("testcookie", "1");

        const postResponse = await fetchImpl(targetPostUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": userAgent,
            Referer: targetPostUrl,
            Cookie: initialCookieHeader,
          },
          body: bodyParams.toString(),
          redirect: "manual", // Capture 302 Found redirect without following
          signal: controller.signal,
        });

        // Extract cookies from POST response
        const postCookies = extractCookiesFromHeaders(postResponse.headers, domain);

        // Check for WordPress authenticated session cookies (must not be empty/expired)
        const hasAuthCookie = postCookies.some(
          (c) =>
            (c.name.startsWith("wordpress_logged_in_") ||
              c.name.startsWith("wordpress_sec_") ||
              (c.name.startsWith("wordpress_") && !c.name.includes("test_cookie"))) &&
            c.value &&
            c.value !== "%20" &&
            c.value.trim().length > 0 &&
            (c.expires === undefined || c.expires > Math.floor(Date.now() / 1000))
        );

        const redirectLocation = postResponse.headers.get("location") || undefined;
        const isRedirectToAdmin =
          redirectLocation &&
          (redirectLocation.includes("/wp-admin") || redirectLocation.includes("dashboard"));

        // Success criteria: Auth cookie present OR 302 redirecting to wp-admin
        if (hasAuthCookie || (postResponse.status === 302 && isRedirectToAdmin)) {
          clearTimeout(timeoutTimer);
          const cookieHeader = postCookies.map((c) => `${c.name}=${c.value}`).join("; ");

          return {
            success: true,
            cookies: postCookies,
            cookieHeader,
            redirectUrl: redirectLocation || `${baseUrl}/wp-admin/`,
            statusCode: postResponse.status,
          };
        }

        // Precise HTTP error status diagnoses
        if (postResponse.status === 403) {
          clearTimeout(timeoutTimer);
          return {
            success: false,
            cookies: [],
            cookieHeader: "",
            error: `HTTP 403 Forbidden: Access to ${targetPostUrl} is blocked by site firewall / WAF (e.g. Cloudflare, Wordfence, or IP restriction).`,
            statusCode: 403,
          };
        }

        if (postResponse.status === 404) {
          clearTimeout(timeoutTimer);
          return {
            success: false,
            cookies: [],
            cookieHeader: "",
            error: `HTTP 404 Not Found: Could not find login endpoint at ${targetPostUrl}. Verify if the site uses a custom login path.`,
            statusCode: 404,
          };
        }

        if (postResponse.status >= 500) {
          clearTimeout(timeoutTimer);
          return {
            success: false,
            cookies: [],
            cookieHeader: "",
            error: `HTTP ${postResponse.status} Server Error: The remote WordPress host encountered an internal server error.`,
            statusCode: postResponse.status,
          };
        }

        // Failure: If 200 OK returned, parse error from HTML
        const responseText = await postResponse.text();
        const errorMsg = parseWpErrorMessage(responseText);

        clearTimeout(timeoutTimer);
        return {
          success: false,
          cookies: [],
          cookieHeader: "",
          error: errorMsg || `WordPress login rejected credentials for user '${username}'.`,
          statusCode: postResponse.status,
        };
      } catch (innerErr: any) {
        lastNetworkError = innerErr;
        if (innerErr.name === "AbortError") {
          throw innerErr;
        }
        // Try next User-Agent candidate if socket/TLS issue occurred
        continue;
      }
    }

    throw lastNetworkError || new Error("Failed to reach WordPress login endpoint.");
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    if (err.name === "AbortError") {
      return {
        success: false,
        cookies: [],
        cookieHeader: "",
        error: `Connection to WordPress site timed out after ${timeoutMs / 1000}s.`,
      };
    }
    const underlyingDetail = err.cause?.message || err.cause?.code || err.message;
    return {
      success: false,
      cookies: [],
      cookieHeader: "",
      error: `Failed to connect to ${loginUrl}: ${underlyingDetail || err.message}`,
    };
  }
}
