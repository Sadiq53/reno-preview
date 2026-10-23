/**
 * Reno Hub — Authenticated Reverse Proxy Gateway (Production-Grade Orchestrator)
 *
 * This is the thin orchestrator that wires together the modular proxy pipeline.
 * All business logic lives in `@/lib/proxy/*` modules — this file only
 * sequences the pipeline stages:
 *
 *   1. Authenticate user session (NextAuth)
 *   2. Resolve project + check assignment
 *   3. Parse & normalize upstream URL
 *   4. Security Sentinel check
 *   5. Authenticate WordPress session (cached)
 *   6. Classify request (HTML vs asset vs API)
 *   7. Forge request headers
 *   8. Fetch upstream (with circuit breaker + retry + connection pooling)
 *   9. Handle redirects
 *  10. Stream-transform HTML or pass-through assets
 *  11. Record metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { decryptSecret, unpackVaultSecret } from "@/lib/crypto";
import { authenticateWordPressSession, normalizeWpLoginUrl } from "@/lib/wp-session";
import { recordAuditLog } from "@/lib/audit";

import type { ProxyContext, ProjectRecord } from "@/lib/proxy/types";
import { FEATURES } from "@/lib/proxy/config";
// Connection pooling is handled by Node.js built-in keep-alive agents
import {
  fetchWithRetry,
  CircuitOpenError,
} from "@/lib/proxy/circuit-breaker";
import {
  getCachedSession,
  setCachedSession,
  getCachedProject,
  setCachedProject,
  buildProjectCacheKey,
  registerRefreshCallback,
  triggerBackgroundPrewarm,
} from "@/lib/proxy/session-manager";
import {
  resolveSubpath,
  normalizeSubpath,
  buildUpstreamUrl,
} from "@/lib/proxy/url-resolver";
import { forgeRequestHeaders, forgeResponseHeaders } from "@/lib/proxy/header-forge";
import { isSentinelBlocked, renderSentinelBlockedHtml } from "@/lib/proxy/security-sentinel";
import { classifyRequest } from "@/lib/proxy/asset-pipeline";
import { createHTMLRewriteStream } from "@/lib/proxy/html-rewriter";
import { handleRedirects } from "@/lib/proxy/redirect-handler";
import {
  renderProxyErrorHtml,
  renderCircuitOpenHtml,
  renderCredentialsMissingHtml,
  renderMockWordPressAdmin,
} from "@/lib/proxy/error-renderer";
import { recordRequest, recordError, recordCacheHit, recordCacheMiss } from "@/lib/proxy/metrics";
import {
  buildCacheKey,
  isStaticCacheable,
  isApiCacheable,
  getStaticCached,
  getStaticCachedL2,
  setStaticCached,
  getApiCached,
  getApiCachedL2,
  setApiCached,
  getInflight,
  setInflight,
  cachedToResponse,
  extractCacheableHeaders,
} from "@/lib/proxy/response-cache";

// ─── Route Params ────────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{
    id: string;
    path?: string[];
  }>;
}

// ─── Session Refresh Callback Registration ───────────────────────────────────
// Registered once at module load. The session manager calls this when a session
// is nearing expiry and needs proactive refresh. This avoids circular imports
// between session-manager and the auth/crypto modules.

registerRefreshCallback(async (projectId: string): Promise<string | null> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        targetUrl: true,
        wpAdminUsernameEncrypted: true,
        wpAdminUsernameIv: true,
        wpAdminUsernameAuthTag: true,
        wpAdminPasswordEncrypted: true,
        wpAdminPasswordIv: true,
        wpAdminPasswordAuthTag: true,
        wpSecretEncrypted: true,
        wpSecretIv: true,
        wpSecretAuthTag: true,
      },
    });

    if (
      !project ||
      !project.wpAdminUsernameEncrypted ||
      !project.wpAdminPasswordEncrypted
    ) {
      return null;
    }

    const username = decryptSecret({
      ciphertext: project.wpAdminUsernameEncrypted,
      iv: project.wpAdminUsernameIv!,
      authTag: project.wpAdminUsernameAuthTag!,
    });
    const password = decryptSecret({
      ciphertext: project.wpAdminPasswordEncrypted,
      iv: project.wpAdminPasswordIv!,
      authTag: project.wpAdminPasswordAuthTag!,
    });

    let customLoginUrl: string | null = (project as any).wpLoginUrl || null;
    if (!customLoginUrl && project.wpSecretEncrypted && project.wpSecretIv && project.wpSecretAuthTag) {
      try {
        const dec = decryptSecret({
          ciphertext: project.wpSecretEncrypted,
          iv: project.wpSecretIv,
          authTag: project.wpSecretAuthTag,
        });
        customLoginUrl = unpackVaultSecret(dec).wpLoginUrl;
      } catch {}
    }

    if (!project.targetUrl) return null;

    const authResult = await authenticateWordPressSession({
      targetUrl: project.targetUrl,
      username,
      password,
      customLoginUrl,
    });

    return authResult.success ? authResult.cookieHeader : null;
  } catch (err) {
    console.warn("[SESSION_REFRESH_CALLBACK_ERROR]", err);
    return null;
  }
});

// ─── Main Handler ────────────────────────────────────────────────────────────

async function handleProxy(req: NextRequest, { params }: RouteParams) {
  const startedAt = Date.now();

  try {
    // ── 1. Authenticate User Session ──────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id: projectId, path: pathSegments } = await params;
    const proxyPrefix = `/api/proxy/${projectId}`;

    // ── 2. Resolve Project & Check Assignment ─────────────────────────────
    const cacheKey = buildProjectCacheKey(projectId, session.user.id, session.user.role);
    let project = getCachedProject(cacheKey);

    if (!project) {
      if (FEATURES.metrics) recordCacheMiss();
      const now = new Date();
      const dbProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          assignments: {
            where: {
              userId: session.user.id,
              revokedAt: null,
              expiresAt: { gt: now },
            },
          },
        },
      });

      if (dbProject) {
        project = dbProject as unknown as ProjectRecord;
        setCachedProject(cacheKey, project);
      }
    } else {
      if (FEATURES.metrics) recordCacheHit();
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found.", code: "PROJECT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (project.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Project is inactive or archived.", code: "PROJECT_INACTIVE" },
        { status: 403 }
      );
    }

    if (session.user.role === "DEVELOPER" && project.assignments.length === 0) {
      return NextResponse.json(
        { error: "Forbidden: Access expired or revoked for this project.", code: "ASSIGNMENT_INACTIVE" },
        { status: 403 }
      );
    }

    // ── 3. Parse & Normalize URL ──────────────────────────────────────────
    const incomingUrl = new URL(req.url);
    const queryString = incomingUrl.search;
    const rawSubpath = resolveSubpath(pathSegments, queryString);
    const cleanSubpath = normalizeSubpath(rawSubpath);

    // ── 4. Security Sentinel ──────────────────────────────────────────────
    const fullRelativePath = `${cleanSubpath}${queryString}`;
    if (isSentinelBlocked(fullRelativePath)) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      await recordAuditLog({
        userId: session.user.id,
        projectId: project.id,
        action: "SECURITY_SENTINEL_BLOCKED",
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") || "ProxyGateway",
        metadata: { blockedPath: fullRelativePath, reason: "Restricted WordPress endpoint." },
      });
      return new NextResponse(renderSentinelBlockedHtml(fullRelativePath), {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // ── 5. Resolve Upstream Target & Authenticate WP Session ──────────────
    let customLoginUrl: string | null = (project as any).wpLoginUrl || null;
    if (!customLoginUrl && project.wpSecretEncrypted && project.wpSecretIv && project.wpSecretAuthTag) {
      try {
        const dec = decryptSecret({
          ciphertext: project.wpSecretEncrypted,
          iv: project.wpSecretIv,
          authTag: project.wpSecretAuthTag,
        });
        customLoginUrl = unpackVaultSecret(dec).wpLoginUrl;
      } catch {}
    }

    const { baseUrl, domain } = normalizeWpLoginUrl(project.targetUrl, customLoginUrl);
    const upstreamUrl = buildUpstreamUrl(baseUrl, cleanSubpath, queryString);

    // Retrieve or create authenticated WP session
    let cookieHeader = getCachedSession(project.id);

    // If no cached session, trigger non-blocking background pre-warm
    // so the NEXT request hits a warm cache (this request still does sync auth below)
    if (!cookieHeader && FEATURES.sessionPrewarm) {
      triggerBackgroundPrewarm(project.id);
    }

    if (!cookieHeader) {
      if (
        project.wpAdminUsernameEncrypted && project.wpAdminPasswordEncrypted &&
        project.wpAdminUsernameIv && project.wpAdminUsernameAuthTag &&
        project.wpAdminPasswordIv && project.wpAdminPasswordAuthTag
      ) {
        try {
          const username = decryptSecret({
            ciphertext: project.wpAdminUsernameEncrypted,
            iv: project.wpAdminUsernameIv,
            authTag: project.wpAdminUsernameAuthTag,
          });
          const password = decryptSecret({
            ciphertext: project.wpAdminPasswordEncrypted,
            iv: project.wpAdminPasswordIv,
            authTag: project.wpAdminPasswordAuthTag,
          });

          const authResult = await authenticateWordPressSession({
            targetUrl: project.targetUrl,
            username,
            password,
            customLoginUrl,
          });

          if (authResult.success) {
            cookieHeader = authResult.cookieHeader;
            setCachedSession(project.id, cookieHeader);
          } else {
            return new NextResponse(
              renderProxyErrorHtml(project.name, upstreamUrl, `WordPress authentication rejected: ${authResult.error || "Verify credentials."}`),
              { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
            );
          }
        } catch (authErr: any) {
          console.warn("[PROXY_AUTH_FAIL]", authErr);
          return new NextResponse(
            renderProxyErrorHtml(project.name, upstreamUrl, `Credential decryption failed: ${authErr.message}`),
            { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      } else {
        return new NextResponse(renderCredentialsMissingHtml(project.name, project.id), {
          status: 422,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    // ── 6. Classify Request ───────────────────────────────────────────────
    const classification = classifyRequest(cleanSubpath, queryString);

    // ── 6.5. Response Cache Check (L1 In-Memory → L2 Redis) ────────────────
    if (req.method === "GET" && FEATURES.responseCache) {
      const cacheKey = buildCacheKey(projectId, cleanSubpath, queryString);

      // Check static asset cache (versioned CSS/JS)
      if (isStaticCacheable(classification, cleanSubpath, queryString)) {
        // L1 check (<0.1ms)
        const l1Hit = getStaticCached(cacheKey);
        if (l1Hit) {
          if (FEATURES.metrics) { recordCacheHit(); recordRequest(baseUrl, Date.now() - startedAt, l1Hit.status, l1Hit.size); }
          const { body, status, headers } = cachedToResponse(l1Hit);
          return new NextResponse(body, { status, headers });
        }
        // L2 check (~1ms, promotes to L1)
        const l2Hit = await getStaticCachedL2(cacheKey);
        if (l2Hit) {
          if (FEATURES.metrics) { recordCacheHit(); recordRequest(baseUrl, Date.now() - startedAt, l2Hit.status, l2Hit.size); }
          const { body, status, headers } = cachedToResponse(l2Hit);
          return new NextResponse(body, { status, headers });
        }
      }

      // Check API response cache (wp-json)
      if (isApiCacheable(req.method, cleanSubpath, classification)) {
        // L1 check
        const l1Hit = getApiCached(cacheKey);
        if (l1Hit) {
          if (FEATURES.metrics) { recordCacheHit(); recordRequest(baseUrl, Date.now() - startedAt, l1Hit.status, l1Hit.size); }
          const { body, status, headers } = cachedToResponse(l1Hit);
          return new NextResponse(body, { status, headers });
        }
        // L2 check
        const l2Hit = await getApiCachedL2(cacheKey);
        if (l2Hit) {
          if (FEATURES.metrics) { recordCacheHit(); recordRequest(baseUrl, Date.now() - startedAt, l2Hit.status, l2Hit.size); }
          const { body, status, headers } = cachedToResponse(l2Hit);
          return new NextResponse(body, { status, headers });
        }

        // Request deduplication: collapse identical in-flight requests
        const inflight = getInflight(cacheKey);
        if (inflight) {
          const result = await inflight;
          if (result) {
            if (FEATURES.metrics) { recordCacheHit(); recordRequest(baseUrl, Date.now() - startedAt, result.status, result.size); }
            const { body, status, headers } = cachedToResponse(result);
            return new NextResponse(body, { status, headers });
          }
        }
      }
    }

    // ── 7. Forge Request Headers ──────────────────────────────────────────
    const forwardHeaders = forgeRequestHeaders(
      req, baseUrl, projectId, classification.shouldRewrite, cookieHeader
    );

    // ── 8. Read Request Body (for POST/PUT/PATCH) ─────────────────────────
    let bodyData: ArrayBuffer | undefined;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      bodyData = await req.arrayBuffer();
    }

    // ── 9. Fetch Upstream (Circuit Breaker + Retry) ──────────────────────
    let upstreamRes: Response;
    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: forwardHeaders,
        body: bodyData,
        redirect: "manual",
      };

      if (FEATURES.retryOnError && FEATURES.circuitBreaker) {
        upstreamRes = await fetchWithRetry(baseUrl, upstreamUrl, fetchOptions);
      } else {
        upstreamRes = await fetch(upstreamUrl, fetchOptions);
      }
    } catch (err: any) {
      console.error("[PROXY_UPSTREAM_ERROR]", err);

      // Circuit breaker open → show status page
      if (err instanceof CircuitOpenError) {
        return new NextResponse(
          renderCircuitOpenHtml(project.name, Math.ceil(err.retryAfterMs / 1000)),
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      // Mock fallback for demo/offline environments
      if (domain === "example.com" || process.env.MOCK_WP_SESSION === "true") {
        return new NextResponse(
          renderMockWordPressAdmin(project.name, baseUrl, projectId, cleanSubpath),
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      if (FEATURES.metrics) recordError();
      return new NextResponse(
        renderProxyErrorHtml(project.name, upstreamUrl, err.message),
        { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // ── 10. Handle Redirects ──────────────────────────────────────────────
    const ctx: ProxyContext = {
      req, session: session as any, project, projectId, proxyPrefix,
      baseUrl, domain, cleanSubpath, queryString, upstreamUrl,
      cookieHeader, customLoginUrl, startedAt,
    };

    const redirectResult = await handleRedirects(
      upstreamRes, upstreamUrl, forwardHeaders, ctx, req.method, bodyData
    );

    if (!redirectResult.followed && redirectResult.clientRedirectUrl) {
      return NextResponse.redirect(
        new URL(redirectResult.clientRedirectUrl, req.url),
        redirectResult.redirectStatus
      );
    }

    upstreamRes = redirectResult.response;

    // ── 11. Build Response ────────────────────────────────────────────────
    const contentType = upstreamRes.headers.get("content-type") || "";
    const responseHeaders = forgeResponseHeaders(upstreamRes.headers, classification);

    // Track latency
    const latencyMs = Date.now() - startedAt;

    // ── HTML Response: Stream-Transform ──────────────────────────────────
    if (contentType.includes("text/html") && classification.shouldRewrite) {
      responseHeaders.delete("content-length"); // Size changes after rewriting

      if (FEATURES.streamingRewrite && upstreamRes.body) {
        // 🚀 Streaming HTML rewrite via TransformStream
        const rewriteStream = createHTMLRewriteStream({
          projectId,
          proxyPrefix,
          baseUrl,
          cleanSubpath,
        });

        const transformedStream = upstreamRes.body.pipeThrough(rewriteStream);

        responseHeaders.append(
          "Set-Cookie",
          `vanguard_active_proxy_project=${projectId}; Path=/; SameSite=Lax`
        );
        responseHeaders.append(
          "Set-Cookie",
          `reno_active_proxy_project=${projectId}; Path=/; SameSite=Lax`
        );

        if (FEATURES.metrics) recordRequest(baseUrl, latencyMs, upstreamRes.status, 0);

        return new NextResponse(transformedStream as any, {
          status: upstreamRes.status,
          headers: responseHeaders,
        });
      } else {
        // Fallback: buffered rewrite (for small responses or when streaming is disabled)
        const { rewriteHTMLBuffered } = await import("@/lib/proxy/html-rewriter");
        const html = await upstreamRes.text();
        const rewritten = await rewriteHTMLBuffered(html, {
          projectId,
          proxyPrefix,
          baseUrl,
          cleanSubpath,
        });

        responseHeaders.append(
          "Set-Cookie",
          `vanguard_active_proxy_project=${projectId}; Path=/; SameSite=Lax`
        );
        responseHeaders.append(
          "Set-Cookie",
          `reno_active_proxy_project=${projectId}; Path=/; SameSite=Lax`
        );

        if (FEATURES.metrics) recordRequest(baseUrl, latencyMs, upstreamRes.status, rewritten.length);

        return new NextResponse(rewritten, {
          status: upstreamRes.status,
          headers: responseHeaders,
        });
      }
    }

    // ── Non-HTML Response: Stream or Cache ────────────────────────────────
    if (FEATURES.metrics) recordRequest(baseUrl, latencyMs, upstreamRes.status, 0);

    // For cacheable responses, buffer and store in cache
    if (req.method === "GET" && FEATURES.responseCache && upstreamRes.status >= 200 && upstreamRes.status < 400) {
      const cacheKey = buildCacheKey(projectId, cleanSubpath, queryString);
      const shouldCacheStatic = isStaticCacheable(classification, cleanSubpath, queryString);
      const shouldCacheApi = isApiCacheable(req.method, cleanSubpath, classification);

      if (shouldCacheStatic || shouldCacheApi) {
        const bodyBytes = new Uint8Array(await upstreamRes.arrayBuffer());
        const cacheHeaders = extractCacheableHeaders(upstreamRes.headers);

        if (shouldCacheStatic) {
          setStaticCached(cacheKey, upstreamRes.status, cacheHeaders, bodyBytes);
        } else {
          setApiCached(cacheKey, upstreamRes.status, cacheHeaders, bodyBytes);
        }

        if (FEATURES.metrics) recordRequest(baseUrl, latencyMs, upstreamRes.status, bodyBytes.byteLength);

        responseHeaders.set("X-Reno-Cache", "MISS");
        return new NextResponse(bodyBytes, {
          status: upstreamRes.status,
          headers: responseHeaders,
        });
      }
    }

    // Non-cacheable: stream pass-through
    if (upstreamRes.body) {
      return new NextResponse(upstreamRes.body as any, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    const buffer = await upstreamRes.arrayBuffer();
    if (FEATURES.metrics) recordRequest(baseUrl, latencyMs, upstreamRes.status, buffer.byteLength);

    return new NextResponse(buffer, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error("[PROXY_GATEWAY_FATAL]", error);
    if (FEATURES.metrics) recordError();
    return NextResponse.json(
      { error: "Reverse proxy gateway error", details: error.message },
      { status: 500 }
    );
  }
}

// ─── HTTP Method Exports ─────────────────────────────────────────────────────

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const HEAD = handleProxy;
export const OPTIONS = handleProxy;
