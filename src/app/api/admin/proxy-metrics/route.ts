/**
 * Reno Hub — Proxy Metrics Admin API
 *
 * Exposes proxy performance metrics for the admin dashboard.
 * Requires ADMIN role authentication.
 *
 * GET /api/admin/proxy-metrics → JSON metrics snapshot
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMetricsSnapshot } from "@/lib/proxy/metrics";
import { getAllBreakerStatuses } from "@/lib/proxy/circuit-breaker";
import { getSessionCacheStats } from "@/lib/proxy/session-manager";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const metrics = getMetricsSnapshot();
  const circuitBreakers = getAllBreakerStatuses();
  const sessionCache = getSessionCacheStats();

  return NextResponse.json({
    proxy: metrics,
    circuitBreakers: circuitBreakers.map((b) => ({
      origin: b.origin,
      state: b.state,
      failureCount: b.failureCount,
      requestCount: b.requestCount,
    })),
    sessionCache: {
      activeSessions: sessionCache.size,
      entries: sessionCache.entries.map((e) => ({
        projectId: e.projectId,
        expiresInMinutes: Math.round(e.expiresIn / 60000),
      })),
    },
  });
}
