import { NextRequest, NextResponse } from "next/server";
import https from "https";
import http from "http";
import zlib from "zlib";
import { URL } from "url";

export const dynamic = "force-dynamic";

interface NativeFetchResult {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  data: Buffer;
  finalUrl: string;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

/**
 * Resilient native HTTP/HTTPS fetcher with TLS certificate flexibility,
 * redirect following, and automatic stream decompression (gzip, deflate, brotli).
 */
function fetchWithNativeHttp(targetUrl: string, maxRedirects = 5): Promise<NativeFetchResult> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return reject(new Error("Invalid target URL"));
    }

    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;

    const req = client.request(
      parsed,
      {
        method: "GET",
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
        rejectUnauthorized: false, // Essential for client staging sites, self-signed dev certs, and new domains
        timeout: 15000,
      },
      (res) => {
        // Handle HTTP redirects (301, 302, 307, 308)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
          const redirected = new URL(res.headers.location, targetUrl).toString();
          return resolve(fetchWithNativeHttp(redirected, maxRedirects - 1));
        }

        const encoding = res.headers["content-encoding"];
        let stream: NodeJS.ReadableStream = res;

        if (encoding === "gzip") {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === "deflate") {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === "br") {
          stream = res.pipe(zlib.createBrotliDecompress());
        }

        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            data: buffer,
            finalUrl: targetUrl,
          });
        });
        stream.on("error", (err) => reject(err));
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Connection timed out after 15 seconds"));
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

/**
 * Preview Frame Proxy Route: /api/preview-proxy?url=...
 *
 * Production-grade Universal Preview Engine for all website types:
 * - Modern SPAs (React, Next.js, Vite, Vue, Nuxt, SvelteKit, Angular)
 * - WordPress (Gutenberg, Elementor, Divi, Classic)
 * - Multi-page, static HTML, Webflow, Shopify, Wix, Squarespace
 *
 * Capabilities:
 * 1. Pre-mount virtual history synchronization so SPA routers match root and subpage routes.
 * 2. In-page anchor and hash link interceptor with smooth-scrolling (e.g. /#work, #services).
 * 3. Transparent subpage proxy routing to prevent breakout and X-Frame-Options blocks.
 * 4. Dual-engine resilient fetch with TLS tolerance and automatic stream decompression.
 * 5. Sanitization of inline meta CSP / X-Frame-Options tags.
 * 6. Bidirectional scroll and layout synchronization with Reno Hub canvas.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing required 'url' parameter", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // Validate URL protocol and SSRF security guardrails
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }

    const host = parsedUrl.hostname.toLowerCase().trim();
    // Strict SSRF guard: Cloud metadata service is ALWAYS blocked unconditionally
    if (host === "169.254.169.254" || host.startsWith("169.254.") || host === "0.0.0.0" || host === "::") {
      return NextResponse.json(
        { error: "Access to private or metadata network addresses is strictly prohibited.", code: "SSRF_BLOCKED" },
        { status: 403 }
      );
    }

    // Block private RFC-1918 subnets in production environments
    const isPrivateSubnet =
      host.endsWith(".internal") ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      /^192\.168\./.test(host);

    if (process.env.NODE_ENV === "production" && (isPrivateSubnet || host === "localhost" || host === "127.0.0.1" || host === "::1")) {
      return NextResponse.json(
        { error: "Access to internal loopback or private network addresses is restricted.", code: "SSRF_BLOCKED" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid URL provided. Only http:// and https:// URLs are supported.", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // Extract initial hash if present (e.g. #work)
  const initialHash = parsedUrl.hash || "";

  // Strip hash for upstream HTTP request (HTTP servers do not process client-side fragments)
  const fetchUrl = new URL(parsedUrl.toString());
  fetchUrl.hash = "";

  let finalUrl = targetUrl;
  let contentType = "text/html; charset=utf-8";
  let htmlContent = "";
  let binaryBuffer: Buffer | null = null;
  let httpStatus = 200;

  // --- MULTI-TIER RESILIENT FETCH ---
  // Strategy 1: Fast standard fetch with realistic browser headers
  let fetchSucceeded = false;
  try {
    const response = await fetch(fetchUrl.toString(), {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (response.ok || response.status < 400) {
      finalUrl = response.url ? `${response.url}${initialHash}` : targetUrl;
      contentType = response.headers.get("content-type") || "text/html";
      httpStatus = response.status;

      if (contentType.includes("text/html")) {
        htmlContent = await response.text();
        fetchSucceeded = true;
      } else {
        const ab = await response.arrayBuffer();
        binaryBuffer = Buffer.from(ab);
        fetchSucceeded = true;
      }
    }
  } catch {
    // Primary fetch failed (TLS error, socket close, WAF block, etc.)
    // Proceed to Strategy 2 (Native HTTP/TLS agent)
  }

  // Strategy 2: Resilient Native HTTP/TLS engine with certificate forgiveness & stream decompression
  if (!fetchSucceeded) {
    try {
      const nativeResult = await fetchWithNativeHttp(fetchUrl.toString());
      finalUrl = nativeResult.finalUrl ? `${nativeResult.finalUrl}${initialHash}` : targetUrl;
      const rawContentType = nativeResult.headers["content-type"];
      contentType = Array.isArray(rawContentType)
        ? rawContentType[0]
        : rawContentType || "text/html";
      httpStatus = nativeResult.statusCode;

      if (contentType.includes("text/html")) {
        htmlContent = nativeResult.data.toString("utf-8");
      } else {
        binaryBuffer = nativeResult.data;
      }
      fetchSucceeded = true;
    } catch (secondaryErr: any) {
      console.error("[PREVIEW_PROXY_FETCH_FAILURE]", targetUrl, secondaryErr?.message);

      // Return styled Crewvia Vanguard diagnostic canvas inside iframe
      const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Preview Unavailable</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #FAFAF7;
      color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      box-sizing: border-box;
      padding: 24px;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 20px;
      padding: 36px 40px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #DC2626;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h2 {
      margin: 0 0 8px 0;
      color: #0F172A;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    p {
      color: #64748B;
      font-size: 13px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    .url {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 10px 14px;
      border-radius: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      word-break: break-all;
      color: #2563EB;
      margin: 16px 0;
    }
    .btn-group {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 24px;
      flex-wrap: wrap;
    }
    .btn-primary {
      background: #2563EB;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary:hover {
      background: #1D4ED8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Connection Diagnostics</div>
    <h2>Target Website Unreachable</h2>
    <p>Crewvia Vanguard was unable to establish a server-side proxy connection to the target website. The host server may be temporarily down or blocking automated requests.</p>
    <div class="url">${targetUrl}</div>
    <div class="btn-group">
      <button class="btn-primary" onclick="window.location.reload()">Retry Connection</button>
    </div>
  </div>
</body>
</html>
`;
      return new NextResponse(errorHtml, {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  // Handle HTML response
  if (contentType.includes("text/html") && htmlContent) {
    // 1. Strip restrictive inline meta tags that browsers enforce inside frames
    let modifiedHtml = htmlContent.replace(
      /<meta[^>]*http-equiv=["']?(?:content-security-policy|x-frame-options)["']?[^>]*>/gi,
      ""
    );

    // 2. Base tag ensuring relative assets (CSS, JS, images, fonts) resolve properly
    const baseTag = `<base href="${finalUrl}" />`;

    // 3. Iframe styling enhancements
    const styleEnhancements = `
<style id="crewvia-preview-enhancements">
  html {
    min-height: 100% !important;
    height: auto !important;
  }
  body {
    min-height: 100vh !important;
  }
</style>
`;

    // 4. Vanguard Universal Preview Engine Sentinel Script
    const unframeScript = `
<script id="crewvia-vanguard-preview-sentinel">
(function() {
  'use strict';

  // Keep references to real top/parent before any site scripts execute
  var realParent = window.parent;
  var realTop = window.top;

  var targetFullUrl = ${JSON.stringify(finalUrl)};
  var targetOrigin = "";
  var targetPathname = "/";
  var targetSearch = "";
  var targetHash = ${JSON.stringify(initialHash)};

  try {
    var parsedTarget = new URL(targetFullUrl);
    targetOrigin = parsedTarget.origin;
    targetPathname = parsedTarget.pathname || "/";
    targetSearch = parsedTarget.search || "";
    if (!targetHash) targetHash = parsedTarget.hash || "";
  } catch(e) {}

  // Helper to qualify URLs against window.location.origin to prevent <base href> DOMException
  function qualifyUrl(u) {
    if (!u || typeof u !== 'string') return u;
    try {
      if (u.startsWith('/')) {
        return window.location.origin + u;
      }
      if (u.startsWith('#')) {
        return window.location.origin + window.location.pathname + window.location.search + u;
      }
      if (targetOrigin && u.startsWith(targetOrigin)) {
        return window.location.origin + u.slice(targetOrigin.length);
      }
    } catch(e) {}
    return u;
  }

  // Monkey-patch history methods immediately to protect against <base href> resolution
  var origPushState = window.history.pushState;
  var origReplaceState = window.history.replaceState;

  window.history.pushState = function(state, title, url) {
    var safeUrl = qualifyUrl(url);
    var res = origPushState.call(this, state, title, safeUrl);
    try {
      if (url && realParent && realParent !== window) {
        var newPath = typeof url === 'string' ? url : window.location.pathname;
        var fullTargetUrl = new URL(newPath, targetOrigin).toString();
        realParent.postMessage({
          type: 'CREWVIA_URL_CHANGE',
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          fullUrl: fullTargetUrl
        }, '*');
      }
    } catch(e) {}
    return res;
  };

  window.history.replaceState = function(state, title, url) {
    var safeUrl = qualifyUrl(url);
    var res = origReplaceState.call(this, state, title, safeUrl);
    try {
      if (url && realParent && realParent !== window && (!state || !state.crewviaVirtual)) {
        var newPath = typeof url === 'string' ? url : window.location.pathname;
        var fullTargetUrl = new URL(newPath, targetOrigin).toString();
        realParent.postMessage({
          type: 'CREWVIA_URL_CHANGE',
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          fullUrl: fullTargetUrl
        }, '*');
      }
    } catch(e) {}
    return res;
  };

  // STEP 1: Pre-mount Virtual History Path Synchronization
  // Ensures SPA routers (React Router, Next.js, Vue Router, Nuxt, Vite) see the exact target pathname
  try {
    var initialVirtualPath = targetPathname + targetSearch + targetHash;
    var safeInitial = qualifyUrl(initialVirtualPath);
    if (window.location.pathname.startsWith('/api/preview-proxy')) {
      origReplaceState.call(window.history, { crewviaVirtual: true }, '', safeInitial);
    }
  } catch(e) {}

  // STEP 2: Prevent Clickjacking Frame-Busting Breakout (Safe Mode)
  try {
    Object.defineProperty(window, 'top', {
      get: function() { return window.self; },
      configurable: false
    });
  } catch (e) {}

  // STEP 2B: Wrap window.open to protect against unexpected frame navigation
  var origWindowOpen = window.open;
  window.open = function(url, target, features) {
    if (!url) return origWindowOpen.call(window, url, target, features);
    try {
      var resolved = new URL(url, targetOrigin || window.location.href);
      var isInternal = (targetOrigin && resolved.origin === targetOrigin) || resolved.origin === window.location.origin;
      if (isInternal && (target === '_self' || !target)) {
        window.location.href = '/api/preview-proxy?url=' + encodeURIComponent(resolved.toString());
        return null;
      }
      if (!isInternal) {
        if (realParent && realParent !== window) {
          realParent.postMessage({
            type: 'CREWVIA_EXTERNAL_LINK_INTERCEPTED',
            url: resolved.toString(),
            hostname: resolved.hostname
          }, '*');
        }
        return origWindowOpen.call(window, resolved.toString(), '_blank', features || 'noopener,noreferrer');
      }
    } catch(e) {}
    return origWindowOpen.call(window, url, target || '_blank', features || 'noopener,noreferrer');
  };

  // STEP 2C: Sanitize Divi & Elementor element links to prevent accidental iframe hijacking
  function sanitizeModuleLinks() {
    try {
      var list = [].concat(window.diviElementLinkData || [], window.et_link_options_data || []);
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (item && item.url) {
          try {
            var u = new URL(item.url, targetOrigin || window.location.href);
            var isExt = targetOrigin && (u.origin !== targetOrigin) && (u.origin !== window.location.origin);
            if (isExt) {
              item.target = '_blank';
            }
          } catch(e) {}
        }
      }
    } catch(e) {}
  }
  sanitizeModuleLinks();
  document.addEventListener('DOMContentLoaded', sanitizeModuleLinks);
  window.addEventListener('load', sanitizeModuleLinks);

  // STEP 3: In-Page Smooth Scroll, Subpage Proxy Routing & External Link Shield
  // Intercepts all clicks on anchors, Divi module links, and cards in the CAPTURE phase
  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!target) return;

    // Check 1: Find closest <a> tag
    var anchor = target.closest('a');
    var rawHref = anchor ? (anchor.getAttribute('href') || anchor.href) : null;

    // Check 2: Check Divi clickable module links (e.g. et_pb_row, et_pb_column, et_pb_module_link)
    var moduleUrl = null;
    var moduleTarget = '_self';
    var diviList = [].concat(window.diviElementLinkData || [], window.et_link_options_data || []);
    if (diviList.length > 0) {
      for (var d = 0; d < diviList.length; d++) {
        var dItem = diviList[d];
        if (dItem && dItem.class && target.closest('.' + dItem.class)) {
          moduleUrl = dItem.url;
          moduleTarget = dItem.target || '_self';
          break;
        }
      }
    }

    var candidateUrl = rawHref || moduleUrl;
    if (!candidateUrl) return;

    // Ignore javascript:, mailto:, tel:
    if (
      candidateUrl.startsWith('javascript:') ||
      candidateUrl.startsWith('mailto:') ||
      candidateUrl.startsWith('tel:')
    ) {
      return;
    }

    // In-page anchor hash links (e.g. #reviews, #work, #services)
    var hashIndex = candidateUrl.indexOf('#');
    if (hashIndex !== -1) {
      var hashPart = candidateUrl.slice(hashIndex);
      var pathPart = candidateUrl.slice(0, hashIndex);

      var isSamePage = false;
      if (!pathPart || pathPart === '#' || pathPart === '/' || pathPart === window.location.pathname || pathPart === targetPathname) {
        isSamePage = true;
      } else {
        try {
          var resolvedUrl = new URL(pathPart, targetOrigin || window.location.href);
          if (
            resolvedUrl.origin === targetOrigin &&
            (resolvedUrl.pathname === window.location.pathname || resolvedUrl.pathname === targetPathname)
          ) {
            isSamePage = true;
          }
        } catch(err) {}
      }

      if (isSamePage && hashPart.length > 1) {
        e.preventDefault();
        e.stopPropagation();

        var targetEl = document.querySelector(hashPart) || document.getElementById(hashPart.slice(1));
        if (targetEl) {
          if (window.lenis && typeof window.lenis.scrollTo === 'function') {
            window.lenis.scrollTo(targetEl, { offset: 0 });
          } else {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }

        try {
          window.history.pushState(null, '', hashPart);
        } catch(err) {}
        return;
      }
    }

    // Resolve URL
    try {
      var resolved = new URL(candidateUrl, targetOrigin || window.location.href);
      var isInternal = (targetOrigin && resolved.origin === targetOrigin) || resolved.origin === window.location.origin;

      if (!isInternal) {
        // EXTERNAL LINK DETECTED (e.g. amazon.com, link.amazon, twitter, social icons, affiliate links)
        // STRICTLY PREVENT IFRAME FROM NAVIGATING TO EXTERNAL SITES THAT REJECT EMBEDDING
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Inform parent preview canvas
        if (realParent && realParent !== window) {
          realParent.postMessage({
            type: 'CREWVIA_EXTERNAL_LINK_INTERCEPTED',
            url: resolved.toString(),
            hostname: resolved.hostname
          }, '*');
        }

        // Safely open in a new browser tab with noopener
        origWindowOpen.call(window, resolved.toString(), '_blank', 'noopener,noreferrer');
        return false;
      }

      // INTERNAL LINK DETECTED (e.g. /gaming-laptops/, /best-deals/)
      // Route smoothly through Reno preview proxy
      e.preventDefault();
      e.stopPropagation();
      var proxyDest = '/api/preview-proxy?url=' + encodeURIComponent(resolved.toString());
      window.location.href = proxyDest;
      return false;
    } catch(err) {}
  }, true);

  // STEP 4: Form submission interceptor for GET forms
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && (form.method || 'GET').toUpperCase() === 'GET' && form.action) {
      e.preventDefault();
      try {
        var formUrl = new URL(form.action, targetOrigin || window.location.href);
        var formData = new FormData(form);
        formData.forEach(function(value, key) {
          formUrl.searchParams.append(key, value.toString());
        });
        window.location.href = '/api/preview-proxy?url=' + encodeURIComponent(formUrl.toString());
      } catch (err) {}
    }
  }, true);

  // STEP 5: Synchronize scroll position with Reno Hub preview canvas
  function emitScroll() {
    try {
      var scrollY = window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0) || 0;
      var scrollHeight = Math.max(
        document.documentElement ? document.documentElement.scrollHeight : 0,
        document.body ? document.body.scrollHeight : 0,
        window.innerHeight || 0
      );
      var clientHeight = window.innerHeight || 0;
      if (realParent && realParent !== window) {
        realParent.postMessage({
          type: 'CREWVIA_SCROLL_UPDATE',
          scrollY: Math.round(scrollY),
          scrollHeight: Math.round(scrollHeight),
          clientHeight: Math.round(clientHeight)
        }, '*');
      }
    } catch(e) {}
  }

  window.addEventListener('scroll', emitScroll, { passive: true });
  window.addEventListener('resize', emitScroll, { passive: true });
  document.addEventListener('DOMContentLoaded', emitScroll);
  window.addEventListener('load', emitScroll);
  setTimeout(emitScroll, 200);
  setTimeout(emitScroll, 600);
  setTimeout(emitScroll, 1200);

  // STEP 6: Listen for scroll & navigation commands dispatched from parent preview canvas
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'CREWVIA_SCROLL_TO') {
      var targetY = typeof e.data.scrollY === 'number' ? e.data.scrollY : 0;
      window.scrollTo({
        top: targetY,
        behavior: e.data.smooth ? 'smooth' : 'auto'
      });
      setTimeout(emitScroll, 100);
    } else if (e.data.type === 'CREWVIA_SCROLL_BY') {
      window.scrollBy(e.data.deltaX || 0, e.data.deltaY || 0);
      emitScroll();
    }
  });

  // STEP 7: Auto-scroll to initial hash if present in target URL (e.g. #work)
  if (targetHash && targetHash.length > 1) {
    function scrollToTargetHash() {
      try {
        var el = document.querySelector(targetHash) || document.getElementById(targetHash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch(err) {}
    }
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(scrollToTargetHash, 300);
    });
    window.addEventListener('load', function() {
      setTimeout(scrollToTargetHash, 600);
      setTimeout(scrollToTargetHash, 1200);
    });
  }
})();
</script>
`;

    // Inject sentinel script, base tag, and styles at the top of <head>
    // unframeScript MUST execute first before any element looks up base href or routing
    const injectedPayload = `\n  ${unframeScript}\n  ${baseTag}\n  ${styleEnhancements}`;
    if (/<head[^>]*>/i.test(modifiedHtml)) {
      modifiedHtml = modifiedHtml.replace(/<head[^>]*>/i, `$&\n${injectedPayload}`);
    } else {
      modifiedHtml = `${injectedPayload}\n${modifiedHtml}`;
    }

    return new NextResponse(modifiedHtml, {
      status: httpStatus,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Handle binary assets (images, css, fonts)
  if (binaryBuffer) {
    return new NextResponse(new Uint8Array(binaryBuffer), {
      status: httpStatus,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse(htmlContent, {
    status: httpStatus,
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
