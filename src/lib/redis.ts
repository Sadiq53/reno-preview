/**
 * Reno Hub — Redis Client Singleton
 *
 * Production-grade Redis connection manager with:
 * - Singleton pattern (persists across HMR in development)
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Graceful shutdown support
 *
 * Configuration via environment variable:
 *   REDIS_URL=redis://user:pass@host:6379/0
 *
 * Falls back to in-memory-only mode if REDIS_URL is not set.
 */

import Redis from "ioredis";

// ─── Global Singleton (persists across HMR) ──────────────────────────────────

const g = globalThis as unknown as {
  __renoRedis?: Redis | null;
  __renoRedisReady?: boolean;
};

/**
 * Get the singleton Redis client.
 * Returns null if REDIS_URL is not configured (falls back to in-memory only).
 */
export function getRedisClient(): Redis | null {
  // No Redis URL → in-memory-only mode
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (g.__renoRedis) {
    return g.__renoRedis;
  }

  const client = new Redis(process.env.REDIS_URL, {
    // ─── Connection ───────────────────────────────────────
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff: 50ms, 100ms, 200ms, ..., max 5s
      const delay = Math.min(times * 50, 5000);
      return delay;
    },
    reconnectOnError(err) {
      // Reconnect on READONLY errors (Redis failover)
      const targetError = "READONLY";
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },

    // ─── Performance ──────────────────────────────────────
    enableReadyCheck: true,
    enableAutoPipelining: true, // Auto-batches commands for throughput
    lazyConnect: false, // Connect immediately

    // ─── Timeouts ─────────────────────────────────────────
    connectTimeout: 5000,
    commandTimeout: 3000,

    // ─── TLS (for managed Redis like Upstash, Redis Cloud) ─
    ...(process.env.REDIS_URL?.startsWith("rediss://")
      ? { tls: { rejectUnauthorized: false } }
      : {}),

    // ─── Key Prefix (namespace isolation) ──────────────────
    keyPrefix: "reno:",
  });

  // ─── Event Handlers ─────────────────────────────────────────────────────

  client.on("connect", () => {
    console.info("🔴 [REDIS] Connected to Redis server");
  });

  client.on("ready", () => {
    g.__renoRedisReady = true;
    console.info("🟢 [REDIS] Ready for commands");
  });

  client.on("error", (err) => {
    console.error("🔴 [REDIS_ERROR]", err.message);
    g.__renoRedisReady = false;
  });

  client.on("close", () => {
    g.__renoRedisReady = false;
    console.warn("⚠️ [REDIS] Connection closed");
  });

  g.__renoRedis = client;
  return client;
}

/**
 * Check if Redis is connected and ready.
 */
export function isRedisReady(): boolean {
  return g.__renoRedisReady === true;
}

/**
 * Gracefully disconnect Redis (for shutdown/cleanup).
 */
export async function disconnectRedis(): Promise<void> {
  if (g.__renoRedis) {
    await g.__renoRedis.quit();
    g.__renoRedis = undefined;
    g.__renoRedisReady = false;
    console.info("🔴 [REDIS] Disconnected gracefully");
  }
}
