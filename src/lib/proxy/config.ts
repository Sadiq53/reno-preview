/**
 * Reno Hub Reverse Proxy — Configuration Constants & Feature Flags
 *
 * Centralized configuration for timeouts, cache TTLs, concurrency limits,
 * and feature toggles. All values are tuned for production WordPress proxying.
 */

// ─── Connection Pool ─────────────────────────────────────────────────────────

/** Maximum concurrent sockets per upstream origin */
export const POOL_CONNECTIONS = 128;

/** HTTP/1.1 pipelining factor (1 = disabled, safe default for WordPress) */
export const POOL_PIPELINING = 1;

/** Idle socket keep-alive duration (ms) */
export const POOL_KEEP_ALIVE_TIMEOUT = 60_000;

/** Maximum socket lifetime (ms) — prevents stale connection issues */
export const POOL_KEEP_ALIVE_MAX_TIMEOUT = 300_000;

/** TCP connect timeout (ms) */
export const POOL_CONNECT_TIMEOUT = 10_000;

/** Upstream response body timeout (ms) */
export const POOL_BODY_TIMEOUT = 60_000;

/** Upstream response headers timeout (ms) */
export const POOL_HEADERS_TIMEOUT = 15_000;

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

/** Number of consecutive failures before tripping the circuit */
export const CB_FAILURE_THRESHOLD = 5;

/** Duration (ms) to keep circuit OPEN before trying HALF_OPEN */
export const CB_RESET_TIMEOUT = 30_000;

/** Number of test requests allowed in HALF_OPEN state */
export const CB_HALF_OPEN_MAX = 2;

/** Per-request timeout before the circuit breaker counts it as a failure (ms) */
export const CB_REQUEST_TIMEOUT = 20_000;

// ─── Session Cache ───────────────────────────────────────────────────────────

/** How long to cache authenticated WP session cookies (ms) — 2 hours */
export const SESSION_CACHE_TTL = 2 * 60 * 60 * 1000;

/** How early before expiry to proactively refresh session (ms) — 15 minutes */
export const SESSION_REFRESH_AHEAD = 15 * 60 * 1000;

// ─── Project Cache ───────────────────────────────────────────────────────────

/** How long to cache project records from DB (ms) — 5 minutes */
export const PROJECT_CACHE_TTL = 5 * 60 * 1000;

// ─── Redirect Handling ──────────────────────────────────────────────────────

/** Maximum number of internal redirects to follow before returning to client */
export const MAX_INTERNAL_REDIRECTS = 5;

// ─── Retry & Backoff ─────────────────────────────────────────────────────────

/** Maximum retry attempts for transient 5xx errors */
export const RETRY_MAX_ATTEMPTS = 2;

/** Base delay for exponential backoff (ms) */
export const RETRY_BASE_DELAY = 200;

/** Maximum jitter added to backoff delay (ms) */
export const RETRY_MAX_JITTER = 100;

// ─── Metrics ─────────────────────────────────────────────────────────────────

/** Maximum number of latency samples to keep per origin */
export const METRICS_MAX_SAMPLES = 100;

// ─── Security Sentinel ──────────────────────────────────────────────────────

/** WordPress endpoints blocked by the Runtime Capability Sentinel */
export const BLOCKED_SENTINEL_PATHS = [
  "plugin-editor.php",
  "theme-editor.php",
  "plugin-install.php",
  "users.php",
  "user-new.php",
  "user-edit.php",
  "profile.php",
  "export-personal-data.php",
  "erase-personal-data.php",
  "action=upload-plugin",
  "action=upload-theme",
] as const;

// ─── User Agents ─────────────────────────────────────────────────────────────

/**
 * User-agents tested to pass WAF TLS fingerprint checks
 * (Cloudflare, Imunify360, LiteSpeed, Wordfence).
 */
export const COMPATIBLE_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
] as const;

// ─── Hop-by-Hop Headers (must not be forwarded) ─────────────────────────────

export const HOP_BY_HOP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "upgrade",
  "content-length",
]);

// ─── Response Headers to Pass Through ────────────────────────────────────────

export const PASSTHROUGH_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "etag",
  "last-modified",
  "x-wp-total",
  "x-wp-totalpages",
  "link",
  "content-language",
  "vary",
] as const;

// ─── Feature Flags ───────────────────────────────────────────────────────────

export const FEATURES = {
  /** Enable streaming HTML rewriting via TransformStream (disable to use buffered fallback) */
  streamingRewrite: false,

  /** Enable per-origin circuit breaker */
  circuitBreaker: true,

  /** Enable background session pre-warming */
  sessionPrewarm: true,

  /** Enable universal builder compatibility patches */
  builderCompat: true,

  /** Enable request/response metrics collection */
  metrics: true,

  /** Enable retry with backoff for transient 5xx errors */
  retryOnError: true,

  /** Enable in-memory response cache (static assets 1hr, API 30s, dedup) */
  responseCache: true,
} as const;
