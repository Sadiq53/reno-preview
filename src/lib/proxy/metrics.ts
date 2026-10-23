/**
 * Reno Hub Reverse Proxy — Observability & Metrics
 *
 * Lightweight in-memory metrics collection for monitoring proxy health,
 * latency trends, throughput, and error rates. No external dependencies.
 *
 * Exposed via `/api/admin/proxy-metrics` for the admin dashboard.
 */

import type { ProxyMetrics } from "./types";
import { METRICS_MAX_SAMPLES } from "./config";

// ─── Global Metrics Singleton ────────────────────────────────────────────────

const g = globalThis as unknown as { __renoProxyMetrics?: ProxyMetrics };

export const metrics: ProxyMetrics =
  g.__renoProxyMetrics ||
  (g.__renoProxyMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    totalBytes: 0,
    latencyHistogram: new Map<string, number[]>(),
    statusCodes: new Map<number, number>(),
    cacheHits: 0,
    cacheMisses: 0,
    circuitBreakerTrips: new Map<string, number>(),
    startedAt: Date.now(),
  });

// ─── Recording Functions ─────────────────────────────────────────────────────

/**
 * Record a completed proxy request for metrics tracking.
 */
export function recordRequest(
  origin: string,
  latencyMs: number,
  status: number,
  bytes: number
): void {
  metrics.totalRequests++;
  metrics.totalBytes += bytes;
  metrics.statusCodes.set(
    status,
    (metrics.statusCodes.get(status) || 0) + 1
  );

  // Rolling window latency samples per origin
  if (!metrics.latencyHistogram.has(origin)) {
    metrics.latencyHistogram.set(origin, []);
  }
  const samples = metrics.latencyHistogram.get(origin)!;
  samples.push(latencyMs);
  if (samples.length > METRICS_MAX_SAMPLES) {
    samples.shift();
  }
}

/**
 * Record a proxy error.
 */
export function recordError(): void {
  metrics.totalErrors++;
}

/**
 * Record a cache hit.
 */
export function recordCacheHit(): void {
  metrics.cacheHits++;
}

/**
 * Record a cache miss.
 */
export function recordCacheMiss(): void {
  metrics.cacheMisses++;
}

/**
 * Record a circuit breaker trip event.
 */
export function recordCircuitTrip(origin: string): void {
  metrics.circuitBreakerTrips.set(
    origin,
    (metrics.circuitBreakerTrips.get(origin) || 0) + 1
  );
}

// ─── Query Functions ─────────────────────────────────────────────────────────

/**
 * Get a serializable snapshot of current metrics for the admin API.
 */
export function getMetricsSnapshot(): Record<string, unknown> {
  const uptimeMs = Date.now() - metrics.startedAt;

  // Calculate average latency across all origins
  let totalLatency = 0;
  let totalSamples = 0;
  const perOrigin: Record<string, { avg: number; p95: number; count: number }> = {};

  for (const [origin, samples] of metrics.latencyHistogram) {
    if (samples.length === 0) continue;
    const sorted = [...samples].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    perOrigin[origin] = {
      avg: Math.round(avg),
      p95: Math.round(p95),
      count: sorted.length,
    };
    totalLatency += sorted.reduce((a, b) => a + b, 0);
    totalSamples += sorted.length;
  }

  return {
    uptime: `${Math.round(uptimeMs / 1000)}s`,
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    errorRate:
      metrics.totalRequests > 0
        ? `${((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2)}%`
        : "0%",
    totalBytes: metrics.totalBytes,
    avgLatencyMs:
      totalSamples > 0 ? Math.round(totalLatency / totalSamples) : 0,
    cacheHitRate:
      metrics.cacheHits + metrics.cacheMisses > 0
        ? `${((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1)}%`
        : "N/A",
    statusCodes: Object.fromEntries(metrics.statusCodes),
    circuitBreakerTrips: Object.fromEntries(metrics.circuitBreakerTrips),
    perOriginLatency: perOrigin,
  };
}
