/**
 * Reno Hub Reverse Proxy — Two-Tier Response Cache (L1 In-Memory + L2 Redis)
 *
 * Production-grade, horizontally-scalable caching architecture:
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  L1: In-Memory (per-process)                                    │
 * │  Latency: <0.1ms │ Size: ~100 hot entries │ LRU Eviction        │
 * │  Purpose: Eliminates Redis round-trips for hottest assets       │
 * ├──────────────────────────────────────────────────────────────────┤
 * │  L2: Redis (shared across all instances)                        │
 * │  Latency: ~1ms │ Size: unlimited │ TTL-based expiry             │
 * │  Purpose: Shared cache for horizontal scaling + persistence     │
 * ├──────────────────────────────────────────────────────────────────┤
 * │  Upstream: WordPress (origin server)                            │
 * │  Latency: 1-3s │ Purpose: Source of truth                       │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Cache Tiers:
 * - Static Assets (versioned CSS/JS): L1 1hr + L2 24hr
 * - API Responses (wp-json GET): L1 30s + L2 60s
 * - Request Deduplication: L1 only (per-process in-flight collapse)
 *
 * Fallback: If Redis is unavailable, operates in L1-only mode seamlessly.
 */

import type { AssetClassification } from "./types";
import { getRedisClient, isRedisReady } from "@/lib/redis";

// ─── Configuration ───────────────────────────────────────────────────────────

// L1 In-Memory
const L1_STATIC_MAX_ENTRIES = 200;
const L1_STATIC_TTL = 60 * 60 * 1000; // 1 hour
const L1_API_MAX_ENTRIES = 100;
const L1_API_TTL = 30_000; // 30 seconds
const L1_MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB max per entry

// L2 Redis
const L2_STATIC_TTL = 24 * 60 * 60; // 24 hours (in seconds for Redis SETEX)
const L2_API_TTL = 60; // 60 seconds
const L2_MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB max per entry

// ─── Types ───────────────────────────────────────────────────────────────────

interface L1CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  cachedAt: number;
  ttl: number;
  size: number;
  hits: number;
  tier: "L1";
}

interface L2SerializedResponse {
  s: number;      // status
  h: Record<string, string>; // headers
  b: string;      // body (base64)
  t: number;      // cachedAt timestamp
  z: number;      // size
}

// ─── Global L1 Caches (persist across HMR) ───────────────────────────────────

const g = globalThis as unknown as {
  __renoL1Static?: Map<string, L1CachedResponse>;
  __renoL1Api?: Map<string, L1CachedResponse>;
  __renoL1Static_v2?: Map<string, L1CachedResponse>;
  __renoL1Api_v2?: Map<string, L1CachedResponse>;
  __renoInflight?: Map<string, Promise<L1CachedResponse | null>>;
};

// Purge legacy corrupted L1 maps if present
if (g.__renoL1Static) {
  g.__renoL1Static.clear();
  delete g.__renoL1Static;
}
if (g.__renoL1Api) {
  g.__renoL1Api.clear();
  delete g.__renoL1Api;
}

const l1Static =
  g.__renoL1Static_v2 || (g.__renoL1Static_v2 = new Map<string, L1CachedResponse>());

const l1Api =
  g.__renoL1Api_v2 || (g.__renoL1Api_v2 = new Map<string, L1CachedResponse>());

const inflightRequests =
  g.__renoInflight || (g.__renoInflight = new Map<string, Promise<L1CachedResponse | null>>());

// ─── Cache Key Generation ────────────────────────────────────────────────────

/**
 * Generate a cache key for a proxy request.
 * Includes project ID to prevent cross-project cache poisoning.
 */
export function buildCacheKey(projectId: string, subpath: string, queryString: string): string {
  return `${projectId}:${subpath}${queryString}`;
}

/**
 * Redis key with tier prefix for namespacing.
 */
function redisKey(tier: "static" | "api", key: string): string {
  return `cache:${tier}:${key}`;
}

// ─── Cacheability Checks ─────────────────────────────────────────────────────

/**
 * Check if a response should be cached as a static asset.
 */
export function isStaticCacheable(
  classification: AssetClassification,
  subpath: string,
  queryString: string
): boolean {
  if (classification.type !== "static-immutable" && classification.type !== "static-versioned") {
    return false;
  }
  if (classification.type === "static-versioned" && !queryString.includes("ver=")) {
    return false;
  }
  return true;
}

/**
 * Check if an API response should be cached.
 */
export function isApiCacheable(
  method: string,
  subpath: string,
  classification: AssetClassification
): boolean {
  if (method !== "GET") return false;
  if (classification.type !== "dynamic-api") return false;

  const cacheablePatterns = [
    "wp-json/wp/v2/users/me",
    "wp-json/wp/v2/types",
    "wp-json/wp/v2/taxonomies",
    "wp-json/wp/v2/",
    "wp-json/oembed",
    "wp-json/yoast",
    "wp-json/sg-ai-studio",
    "wp-json/divi/v1/builder-settings",
    "wp-json/divi/v1/global-presets",
  ];

  return cacheablePatterns.some((pattern) => subpath.includes(pattern));
}

// ─── Helper: Clean Headers for Caching ───────────────────────────────────────

function sanitizeCacheHeaders(headers: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    // NEVER cache compression or hop-by-hop framing headers
    if (
      lower === "content-encoding" ||
      lower === "content-length" ||
      lower === "transfer-encoding" ||
      lower === "connection"
    ) {
      continue;
    }
    clean[k] = v;
  }
  return clean;
}

// ─── L1 In-Memory Operations ─────────────────────────────────────────────────

function l1Get(
  cache: Map<string, L1CachedResponse>,
  key: string
): L1CachedResponse | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > cached.ttl) {
    cache.delete(key);
    return null;
  }
  // Safeguard: If cached entry contains content-encoding, evict it immediately
  if (cached.headers["content-encoding"] || cached.headers["Content-Encoding"]) {
    cache.delete(key);
    return null;
  }
  cached.hits++;
  return cached;
}

function l1Set(
  cache: Map<string, L1CachedResponse>,
  maxEntries: number,
  key: string,
  status: number,
  headers: Record<string, string>,
  body: Buffer,
  ttl: number
): void {
  if (body.byteLength > L1_MAX_BODY_SIZE) return;

  // LRU eviction
  if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, {
    status,
    headers: sanitizeCacheHeaders(headers),
    body,
    cachedAt: Date.now(),
    ttl,
    size: body.byteLength,
    hits: 0,
    tier: "L1",
  });
}

// ─── L2 Redis Operations ─────────────────────────────────────────────────────

async function l2Get(tier: "static" | "api", key: string): Promise<L1CachedResponse | null> {
  const redis = getRedisClient();
  if (!redis || !isRedisReady()) return null;

  try {
    const raw = await redis.get(redisKey(tier, key));
    if (!raw) return null;

    const data: L2SerializedResponse = JSON.parse(raw);
    const body = Buffer.from(data.b, "base64");

    return {
      status: data.s,
      headers: sanitizeCacheHeaders(data.h || {}),
      body,
      cachedAt: data.t,
      ttl: tier === "static" ? L1_STATIC_TTL : L1_API_TTL,
      size: data.z,
      hits: 0,
      tier: "L1", // Promoted to L1
    };
  } catch (err) {
    console.warn(`⚠️ [CACHE_L2_GET_ERROR] ${tier}:${key}`, err);
    return null;
  }
}

async function l2Set(
  tier: "static" | "api",
  key: string,
  status: number,
  headers: Record<string, string>,
  body: Buffer
): Promise<void> {
  const redis = getRedisClient();
  if (!redis || !isRedisReady()) return;
  if (body.byteLength > L2_MAX_BODY_SIZE) return;

  const ttl = tier === "static" ? L2_STATIC_TTL : L2_API_TTL;
  const data: L2SerializedResponse = {
    s: status,
    h: sanitizeCacheHeaders(headers),
    b: body.toString("base64"),
    t: Date.now(),
    z: body.byteLength,
  };

  try {
    await redis.setex(redisKey(tier, key), ttl, JSON.stringify(data));
  } catch (err) {
    console.warn(`⚠️ [CACHE_L2_SET_ERROR] ${tier}:${key}`, err);
  }
}

// ─── Two-Tier Cache API ──────────────────────────────────────────────────────

/**
 * Look up a static asset in L1, then L2.
 * If found in L2, promotes to L1 for subsequent hits.
 */
export function getStaticCached(key: string): L1CachedResponse | null {
  // L1 check (synchronous, <0.1ms)
  const l1Hit = l1Get(l1Static, key);
  if (l1Hit) return l1Hit;
  return null; // L2 check is async, handled separately
}

/**
 * Async L2 lookup for static assets. Called when L1 misses.
 */
export async function getStaticCachedL2(key: string): Promise<L1CachedResponse | null> {
  const l2Hit = await l2Get("static", key);
  if (l2Hit) {
    // Promote to L1
    l1Set(l1Static, L1_STATIC_MAX_ENTRIES, key, l2Hit.status, l2Hit.headers, l2Hit.body, L1_STATIC_TTL);
  }
  return l2Hit;
}

/**
 * Store a static asset in both L1 and L2.
 */
export async function setStaticCached(
  key: string,
  status: number,
  headers: Record<string, string>,
  body: Uint8Array
): Promise<void> {
  const buf = Buffer.from(body);

  // L1 (sync)
  l1Set(l1Static, L1_STATIC_MAX_ENTRIES, key, status, headers, buf, L1_STATIC_TTL);

  // L2 (async, fire-and-forget)
  l2Set("static", key, status, headers, buf).catch(() => {});
}

/**
 * Look up an API response in L1, then L2.
 */
export function getApiCached(key: string): L1CachedResponse | null {
  const l1Hit = l1Get(l1Api, key);
  if (l1Hit) return l1Hit;
  return null;
}

/**
 * Async L2 lookup for API responses.
 */
export async function getApiCachedL2(key: string): Promise<L1CachedResponse | null> {
  const l2Hit = await l2Get("api", key);
  if (l2Hit) {
    l1Set(l1Api, L1_API_MAX_ENTRIES, key, l2Hit.status, l2Hit.headers, l2Hit.body, L1_API_TTL);
  }
  return l2Hit;
}

/**
 * Store an API response in both L1 and L2.
 */
export async function setApiCached(
  key: string,
  status: number,
  headers: Record<string, string>,
  body: Uint8Array
): Promise<void> {
  const buf = Buffer.from(body);

  // L1 (sync)
  l1Set(l1Api, L1_API_MAX_ENTRIES, key, status, headers, buf, L1_API_TTL);

  // L2 (async, fire-and-forget)
  l2Set("api", key, status, headers, buf).catch(() => {});
}

// ─── Request Deduplication ───────────────────────────────────────────────────

export function getInflight(key: string): Promise<L1CachedResponse | null> | null {
  return inflightRequests.get(key) || null;
}

export function setInflight(key: string, promise: Promise<L1CachedResponse | null>): void {
  inflightRequests.set(key, promise);
  promise.finally(() => {
    inflightRequests.delete(key);
  });
}

// ─── Response Conversion ─────────────────────────────────────────────────────

/**
 * Convert a cached response to NextResponse-compatible format.
 */
export function cachedToResponse(cached: L1CachedResponse): {
  body: ArrayBuffer;
  status: number;
  headers: Headers;
} {
  const headers = new Headers();
  for (const [key, val] of Object.entries(cached.headers)) {
    const lower = key.toLowerCase();
    // NEVER pass content-encoding, content-length, or hop-by-hop framing headers
    if (
      lower === "content-encoding" ||
      lower === "content-length" ||
      lower === "transfer-encoding" ||
      lower === "connection"
    ) {
      continue;
    }
    headers.set(key, val);
  }
  headers.set("X-Reno-Cache", "HIT");
  headers.set("X-Reno-Cache-Tier", cached.tier);
  headers.set("X-Reno-Cache-Age", `${Math.round((Date.now() - cached.cachedAt) / 1000)}s`);

  return {
    body: cached.body.buffer.slice(
      cached.body.byteOffset,
      cached.body.byteOffset + cached.body.byteLength
    ) as ArrayBuffer,
    status: cached.status,
    headers,
  };
}

/**
 * Extract cacheable headers from an upstream response.
 */
export function extractCacheableHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  // NOTE: Do NOT include content-encoding — Node.js fetch() auto-decompresses
  // the body, so cached content is always plain/decompressed.
  const keep = [
    "content-type",
    "etag",
    "last-modified",
    "cache-control",
    "content-disposition",
  ];
  for (const key of keep) {
    const val = headers.get(key);
    if (val) result[key] = val;
  }
  // Explicitly ensure compression or framing headers are NEVER cached
  delete result["content-encoding"];
  delete result["Content-Encoding"];
  delete result["content-length"];
  delete result["Content-Length"];
  delete result["transfer-encoding"];
  delete result["Transfer-Encoding"];
  return result;
}

// ─── Cache Invalidation ──────────────────────────────────────────────────────

/**
 * Invalidate all cached entries for a project (both L1 and L2).
 * Called when project credentials or settings change.
 */
export async function invalidateProjectCache(projectId: string): Promise<void> {
  // L1: Clear all entries with matching project ID prefix
  for (const key of l1Static.keys()) {
    if (key.startsWith(`${projectId}:`)) l1Static.delete(key);
  }
  for (const key of l1Api.keys()) {
    if (key.startsWith(`${projectId}:`)) l1Api.delete(key);
  }

  // L2: Scan and delete matching keys in Redis
  const redis = getRedisClient();
  if (redis && isRedisReady()) {
    try {
      const pipeline = redis.pipeline();
      // Use SCAN to find all keys for this project (non-blocking)
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          `reno:cache:*:${projectId}:*`,
          "COUNT",
          100
        );
        cursor = nextCursor;
        for (const key of keys) {
          // Strip the key prefix since ioredis adds it automatically
          pipeline.del(key.replace(/^reno:/, ""));
        }
      } while (cursor !== "0");
      await pipeline.exec();
    } catch (err) {
      console.warn("⚠️ [CACHE_INVALIDATE_ERROR]", err);
    }
  }
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export async function getResponseCacheStats(): Promise<{
  l1: {
    static: { entries: number; totalSize: number; totalHits: number };
    api: { entries: number; totalSize: number; totalHits: number };
  };
  l2: {
    connected: boolean;
    keyCount: number | null;
    memoryUsed: string | null;
  };
  inflight: number;
}> {
  // L1 stats
  let l1StaticSize = 0, l1StaticHits = 0;
  for (const entry of l1Static.values()) {
    l1StaticSize += entry.size;
    l1StaticHits += entry.hits;
  }

  let l1ApiSize = 0, l1ApiHits = 0;
  for (const entry of l1Api.values()) {
    l1ApiSize += entry.size;
    l1ApiHits += entry.hits;
  }

  // L2 stats
  let l2Stats: { connected: boolean; keyCount: number | null; memoryUsed: string | null } = {
    connected: false,
    keyCount: null,
    memoryUsed: null,
  };

  const redis = getRedisClient();
  if (redis && isRedisReady()) {
    try {
      const info = await redis.info("memory");
      const memMatch = info.match(/used_memory_human:(.+)/);
      const dbSize = await redis.dbsize();
      l2Stats = {
        connected: true,
        keyCount: dbSize,
        memoryUsed: memMatch ? memMatch[1].trim() : null,
      };
    } catch {
      l2Stats.connected = false;
    }
  }

  return {
    l1: {
      static: { entries: l1Static.size, totalSize: l1StaticSize, totalHits: l1StaticHits },
      api: { entries: l1Api.size, totalSize: l1ApiSize, totalHits: l1ApiHits },
    },
    l2: l2Stats,
    inflight: inflightRequests.size,
  };
}
