import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import https from "https";
import http from "http";
import zlib from "zlib";
import { URL } from "url";

export const dynamic = "force-dynamic";

export interface DiscoveredPage {
  path: string;
  title: string;
  fullUrl: string;
  category: "CORE" | "SHOP" | "BLOG" | "LEGAL" | "OTHER";
  isDefault: boolean;
}

interface NativeFetchResult {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  text: string;
  finalUrl: string;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

/**
 * Resilient native HTTP/HTTPS fetcher with TLS certificate flexibility,
 * redirect following, and automatic stream decompression (gzip, deflate, brotli).
 * Works reliably even when Node.js global fetch gets blocked by CDN / WAF layers.
 */
function fetchNative(targetUrl: string, timeoutMs = 8000, maxRedirects = 4): Promise<NativeFetchResult> {
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
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
        },
        rejectUnauthorized: false, // Essential for client staging sites, self-signed dev certs
        timeout: timeoutMs,
      },
      (res) => {
        // Handle HTTP redirects (301, 302, 307, 308)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          maxRedirects > 0
        ) {
          const redirected = new URL(res.headers.location, targetUrl).toString();
          return resolve(fetchNative(redirected, timeoutMs, maxRedirects - 1));
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
            text: buffer.toString("utf-8"),
            finalUrl: targetUrl,
          });
        });
        stream.on("error", (err) => reject(err));
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Connection timed out after ${timeoutMs}ms`));
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
}

// Clean text extracted from HTML (strip tags & decode common HTML entities)
function cleanHtmlText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Helper to format clean human-readable title from path or slug
function slugToTitle(slug: string): string {
  const clean = slug
    .replace(/^\/|\/$/g, "")
    .replace(/\.(html|php|htm|aspx)$/i, "");
  if (!clean) return "Home";
  const lastPart = clean.split("/").pop() || clean;
  return lastPart
    .split(/[-_+]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Semantic page categorization
function categorizePath(pathname: string): "CORE" | "SHOP" | "BLOG" | "LEGAL" | "OTHER" {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return "CORE";

  // Legal / Compliance
  if (
    /(privacy|terms|disclaimer|legal|cookie|accessibility|policy|compliance|gdpr|imprint)/i.test(p)
  ) {
    return "LEGAL";
  }

  // Shop / Commerce / Deals
  if (
    /(\/|^)(shop|store|product|products|collection|collections|cart|checkout|deal|deals|pricing|buy)(\/|$)/i.test(p)
  ) {
    return "SHOP";
  }

  // Blog / Articles / Guides / Reviews
  if (
    /(\/|^)(blog|posts?|articles?|news|guides?|reviews?|insights?|tutorials?|tag|category)(\/|$)/i.test(p)
  ) {
    return "BLOG";
  }

  // Core Static / Navigation Pages
  if (
    /(\/|^)(about|contact|features|services|faq|team|careers|portfolio|work|solutions|company|support|login|register|dashboard|best-deals|guides-reviews)(\/|$)/i.test(p)
  ) {
    return "CORE";
  }

  // Top-level depth check: single-segment paths are usually core pages (e.g. /headphones, /keyboards, /monitors)
  const segments = p.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "CORE";
  }

  return "OTHER";
}

/**
 * Universal Multi-Engine Website Page Discovery
 * Tier 1: Robots.txt & Recursive Sitemap Index Crawling (Yoast, RankMath, Core WP, Next.js, Webflow, Shopify)
 * Tier 2: Homepage Navigation, Header, & Footer Structural DOM Link Extraction
 * Tier 3: SPA Bundle & Route Manifest Parsing (Next.js, Vite, React Router, section anchors)
 * Tier 4: Headless CMS REST APIs (WordPress pages/posts, Shopify endpoints)
 * Tier 5: Common Universal Business Route Probing (fallback)
 * Tier 6: Client-Assisted Injected Links Merging
 */
async function discoverPagesForUrl(
  targetUrl: string,
  clientLinks: Array<{ path: string; title?: string }> = []
): Promise<{ pages: DiscoveredPage[]; categories: Record<string, number> }> {
  const origin = new URL(targetUrl).origin;
  const discovered = new Map<string, DiscoveredPage>();

  // Always ensure root Home exists
  discovered.set("/", {
    path: "/",
    title: "Home",
    fullUrl: origin,
    category: "CORE",
    isDefault: true,
  });

  const registerPage = (
    rawPath: string,
    rawTitle = "",
    catHint?: "CORE" | "SHOP" | "BLOG" | "LEGAL" | "OTHER"
  ) => {
    try {
      const u = new URL(rawPath, origin);
      if (u.origin !== origin) return;

      let pathname = u.pathname.replace(/\/+$/, "") || "/";
      if (u.hash) {
        pathname = `${pathname === "/" ? "" : pathname}${u.hash}`;
      }

      // Filter out non-webpage static assets
      if (
        /\.(png|jpe?g|gif|svg|webp|ico|css|js|pdf|zip|mp4|webm|xml|json|woff2?|ttf|eot|map|txt|rss)$/i.test(
          pathname
        )
      ) {
        return;
      }

      // Filter out internal system / admin / cgi paths
      if (
        pathname.startsWith("/wp-admin") ||
        pathname.startsWith("/wp-includes") ||
        pathname.startsWith("/wp-content") ||
        pathname.startsWith("/cdn-cgi") ||
        pathname.startsWith("/api")
      ) {
        return;
      }

      const category = catHint || categorizePath(pathname);
      let pageTitle = rawTitle ? cleanHtmlText(rawTitle) : "";
      if (!pageTitle || pageTitle.length > 70 || pageTitle.includes("{")) {
        pageTitle = slugToTitle(pathname);
      }

      if (!discovered.has(pathname)) {
        discovered.set(pathname, {
          path: pathname,
          title: pageTitle,
          fullUrl: u.href,
          category,
          isDefault: pathname === "/",
        });
      } else {
        const existing = discovered.get(pathname)!;
        // Upgrade title if we find a better descriptive anchor title
        if (
          rawTitle &&
          rawTitle.length > 2 &&
          rawTitle.length < 50 &&
          (!existing.title || existing.title === slugToTitle(pathname))
        ) {
          existing.title = cleanHtmlText(rawTitle);
        }
      }
    } catch {}
  };

  // Register any client-assisted links passed from preview iframe / companion
  if (Array.isArray(clientLinks)) {
    for (const cl of clientLinks) {
      if (cl?.path) {
        registerPage(cl.path, cl.title);
      }
    }
  }

  // --- TIER 1: Robots.txt & Recursive Sitemap Index Crawler ---
  let sitemapIndexUrls = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/wp-sitemap.xml`,
    `${origin}/page-sitemap.xml`,
  ];

  try {
    const robotsRes = await fetchNative(`${origin}/robots.txt`, 3000);
    if (robotsRes.statusCode === 200) {
      const sitemapDirectives = [
        ...robotsRes.text.matchAll(/Sitemap:\s*(https?:\/\/[^\r\n]+)/gi),
      ].map((m) => m[1].trim());
      if (sitemapDirectives.length > 0) {
        sitemapIndexUrls = [...new Set([...sitemapDirectives, ...sitemapIndexUrls])];
      }
    }
  } catch {}

  const processedSitemaps = new Set<string>();
  const subSitemapsToFetch: string[] = [];

  for (const smUrl of sitemapIndexUrls) {
    if (processedSitemaps.has(smUrl)) continue;
    processedSitemaps.add(smUrl);
    try {
      const res = await fetchNative(smUrl, 4000);
      if (res.statusCode === 200 && res.text.includes("<loc>")) {
        const locs = [...res.text.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi)].map((m) =>
          m[1].trim()
        );
        for (const loc of locs) {
          if (loc.endsWith(".xml") || loc.endsWith(".xml.gz")) {
            subSitemapsToFetch.push(loc);
          } else {
            registerPage(loc);
          }
        }
        // Found valid primary sitemap
        break;
      }
    } catch {}
  }

  // Fetch sub-sitemaps concurrently (up to 12 sitemaps in parallel)
  const uniqueSubSitemaps = [...new Set(subSitemapsToFetch)].slice(0, 12);
  if (uniqueSubSitemaps.length > 0) {
    await Promise.allSettled(
      uniqueSubSitemaps.map(async (subUrl) => {
        try {
          const subRes = await fetchNative(subUrl, 4500);
          if (subRes.statusCode === 200) {
            const locs = [
              ...subRes.text.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/gi),
            ].map((m) => m[1].trim());
            for (const loc of locs) {
              if (!loc.endsWith(".xml") && !loc.endsWith(".xml.gz")) {
                registerPage(loc);
              }
            }
          }
        } catch {}
      })
    );
  }

  // --- TIER 2: Homepage Navigation, Header & Footer DOM Link Extraction ---
  try {
    const homeRes = await fetchNative(origin, 6000);
    if (homeRes.statusCode === 200) {
      const html = homeRes.text;

      // Extract all <a> anchor elements
      const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
      let match;
      while ((match = anchorRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const rawText = match[2];
        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("javascript:")
        ) {
          continue;
        }
        registerPage(href, rawText);
      }

      // --- TIER 3: SPA / Modern JS Bundle Route & Anchor Extraction ---
      const scriptTags = [
        ...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
      ].map((m) => m[1]);

      // Inspect client-side script bundles for router configurations (e.g. Vite, React, Next.js)
      const jsBundles = scriptTags
        .filter(
          (s) =>
            s.includes("/assets/") ||
            s.includes("/chunks/") ||
            s.includes("/static/") ||
            s.includes("main") ||
            s.includes("index")
        )
        .slice(0, 3);

      await Promise.allSettled(
        jsBundles.map(async (bundleSrc) => {
          try {
            const bundleUrl = new URL(bundleSrc, origin).href;
            const jsRes = await fetchNative(bundleUrl, 4000);
            if (jsRes.statusCode === 200) {
              const js = jsRes.text;
              // Declared routes (e.g. path: "/...", to: "/...", href: "/...")
              const pathMatches = [
                ...js.matchAll(/(?:path|to|href|route)\s*:\s*["'](\/[a-zA-Z0-9_\-\/]*)["']/gi),
              ].map((m) => m[1]);
              for (const p of pathMatches) {
                if (p && p.length > 1 && !p.startsWith("/api") && !p.startsWith("/_")) {
                  registerPage(p);
                }
              }

              // Section anchors for single-page portfolio/landing pages (e.g. #work, #services)
              const hashMatches = [
                ...js.matchAll(/["'](#(?:about|contact|work|services|portfolio|features|team|pricing)[a-zA-Z0-9_\-]*)["']/gi),
              ].map((m) => m[1]);
              for (const h of hashMatches) {
                const anchorPath = `/${h}`;
                const title = slugToTitle(h.replace(/^#/, ""));
                registerPage(anchorPath, title, "CORE");
              }
            }
          } catch {}
        })
      );
    }
  } catch {}

  // --- TIER 4: Headless CMS REST APIs ---
  // WordPress Pages REST API
  try {
    const wpRes = await fetchNative(
      `${origin}/wp-json/wp/v2/pages?per_page=100&_fields=id,title,link`,
      3500
    );
    if (wpRes.statusCode === 200) {
      const data = JSON.parse(wpRes.text);
      if (Array.isArray(data)) {
        for (const p of data) {
          registerPage(p.link, p.title?.rendered, "CORE");
        }
      }
    }
  } catch {}

  // --- TIER 5: Fallback Common Universal Route Probing ---
  // If fewer than 5 pages discovered, probe standard business routes in parallel
  if (discovered.size < 5) {
    const commonRoutes = [
      "/about",
      "/about-us",
      "/contact",
      "/contact-us",
      "/services",
      "/work",
      "/portfolio",
      "/pricing",
      "/faq",
      "/blog",
      "/shop",
      "/terms",
      "/privacy-policy",
    ];

    await Promise.allSettled(
      commonRoutes.map(async (r) => {
        try {
          const res = await fetchNative(`${origin}${r}`, 3000);
          if (res.statusCode === 200) {
            registerPage(r, slugToTitle(r));
          }
        } catch {}
      })
    );
  }

  // --- SORTING & CATEGORIZATION SUMMARY ---
  const pagesList = Array.from(discovered.values());

  // Category counts
  const categories: Record<string, number> = {
    CORE: 0,
    SHOP: 0,
    BLOG: 0,
    LEGAL: 0,
    OTHER: 0,
  };

  for (const p of pagesList) {
    categories[p.category] = (categories[p.category] || 0) + 1;
  }

  // Priority order for sorting: Home first, then CORE, then SHOP, then LEGAL, then BLOG, then OTHER
  const catPriority: Record<string, number> = {
    CORE: 1,
    SHOP: 2,
    LEGAL: 3,
    BLOG: 4,
    OTHER: 5,
  };

  pagesList.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    const catDiff = (catPriority[a.category] || 99) - (catPriority[b.category] || 99);
    if (catDiff !== 0) return catDiff;
    return a.path.localeCompare(b.path);
  });

  return { pages: pagesList, categories };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl.trim())) {
      return NextResponse.json(
        { error: "Valid website URL starting with http:// or https:// is required" },
        { status: 400 }
      );
    }

    const { pages, categories } = await discoverPagesForUrl(targetUrl.trim());

    return NextResponse.json({
      ok: true,
      targetUrl: targetUrl.trim(),
      pages,
      categories,
      totalCount: pages.length,
    });
  } catch (error: any) {
    console.error("[DISCOVER_PAGES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to scan website pages", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const targetUrl = body?.targetUrl || body?.url;
    const clientLinks = body?.clientLinks || [];

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl.trim())) {
      return NextResponse.json(
        { error: "Valid website URL starting with http:// or https:// is required" },
        { status: 400 }
      );
    }

    const { pages, categories } = await discoverPagesForUrl(targetUrl.trim(), clientLinks);

    return NextResponse.json({
      ok: true,
      targetUrl: targetUrl.trim(),
      pages,
      categories,
      totalCount: pages.length,
    });
  } catch (error: any) {
    console.error("[DISCOVER_PAGES_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to scan website pages", details: error.message },
      { status: 500 }
    );
  }
}
