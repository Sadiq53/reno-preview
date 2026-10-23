/**
 * Reno Hub Reverse Proxy — Shared Type Definitions
 *
 * Every module in the proxy pipeline operates on a shared `ProxyContext`
 * that is assembled incrementally by the orchestrator route handler.
 */

import type { NextRequest } from "next/server";

// ─── Request Context ─────────────────────────────────────────────────────────

export interface ProxyContext {
  /** Incoming Next.js request */
  req: NextRequest;
  /** Authenticated user session */
  session: { user: { id: string; role: string; email?: string } };
  /** Resolved project record from DB (with assignments) */
  project: ProjectRecord;
  /** Project UUID */
  projectId: string;
  /** Proxy route prefix for this project: `/api/proxy/{projectId}` */
  proxyPrefix: string;
  /** Resolved upstream base URL (e.g. `https://client-site.com`) */
  baseUrl: string;
  /** Upstream domain (e.g. `client-site.com`) */
  domain: string;
  /** Clean subpath after the proxy prefix (e.g. `wp-admin/edit.php`) */
  cleanSubpath: string;
  /** Raw query string including `?` (e.g. `?page=jetpack`) */
  queryString: string;
  /** Fully resolved upstream URL to fetch */
  upstreamUrl: string;
  /** Authenticated WP session cookie header string */
  cookieHeader: string;
  /** Custom WP login URL (if configured) */
  customLoginUrl: string | null;
  /** Timestamp when the request started (for latency tracking) */
  startedAt: number;
}

// ─── Project Record (subset of Prisma model) ────────────────────────────────

export interface ProjectRecord {
  id: string;
  name: string;
  clientName: string;
  targetUrl: string;
  status: string;
  wpAdminUsernameEncrypted: string | null;
  wpAdminUsernameIv: string | null;
  wpAdminUsernameAuthTag: string | null;
  wpAdminPasswordEncrypted: string | null;
  wpAdminPasswordIv: string | null;
  wpAdminPasswordAuthTag: string | null;
  wpSecretEncrypted: string | null;
  wpSecretIv: string | null;
  wpSecretAuthTag: string | null;
  wpLoginUrl?: string | null;
  assignments: { id: string }[];
}

// ─── Asset Classification ────────────────────────────────────────────────────

export type AssetType =
  | "static-immutable"
  | "static-versioned"
  | "dynamic-api"
  | "dynamic-html"
  | "admin-ajax";

export interface AssetClassification {
  type: AssetType;
  /** HTTP Cache-Control header value */
  cacheControl: string;
  /** Whether HTML content rewriting is needed */
  shouldRewrite: boolean;
  /** Whether to stream response directly without buffering */
  streamDirectly: boolean;
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface BreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  /** Total requests since last state change */
  requestCount: number;
}

// ─── Session Cache ───────────────────────────────────────────────────────────

export interface SessionCacheEntry {
  cookieHeader: string;
  expiresAt: number;
}

export interface ProjectCacheEntry {
  project: ProjectRecord;
  expiresAt: number;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface ProxyMetrics {
  totalRequests: number;
  totalErrors: number;
  totalBytes: number;
  /** origin → last N latency samples (ms) */
  latencyHistogram: Map<string, number[]>;
  /** HTTP status code → count */
  statusCodes: Map<number, number>;
  cacheHits: number;
  cacheMisses: number;
  /** origin → trip count */
  circuitBreakerTrips: Map<string, number>;
  /** Timestamp of process start */
  startedAt: number;
}

// ─── Builder Compatibility ───────────────────────────────────────────────────

export interface BuilderPatch {
  name: string;
  /** Detect whether this builder is present in the HTML */
  detect: (html: string) => boolean;
  /** Generate client-side JavaScript patch */
  patchScript: (proxyPrefix: string) => string;
  /** Optional CSS to inject */
  patchCSS?: () => string;
  /** Query params that indicate builder edit mode (bypass caching) */
  queryBypass?: string[];
}
