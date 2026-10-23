/**
 * Reno Hub Reverse Proxy — Connection Pool Configuration
 *
 * Next.js uses undici under the hood for its global `fetch()` with
 * keep-alive enabled by default. Rather than importing undici directly
 * (which causes webpack bundling issues), we configure connection pooling
 * through Node.js built-in HTTP/HTTPS agents.
 *
 * For production deployments behind Nginx/Caddy, upstream keepalive is
 * configured at the reverse proxy layer. For the Node.js process itself,
 * we configure custom agents with aggressive connection reuse.
 *
 * Key behavior:
 * - Keep-alive enabled (reuses TCP/TLS sockets across requests)
 * - Max sockets per origin: 128 (handles concurrent wp-admin sub-resource loads)
 * - Free socket timeout: 60s (matches typical upstream Nginx idle timeout)
 */

import http from "node:http";
import https from "node:https";
import {
  POOL_CONNECTIONS,
  POOL_KEEP_ALIVE_TIMEOUT,
} from "./config";

// ─── Global Agents (persist across HMR) ──────────────────────────────────────

const g = globalThis as unknown as {
  __renoHttpAgent?: http.Agent;
  __renoHttpsAgent?: https.Agent;
};

/**
 * Returns a singleton HTTP Agent with aggressive keep-alive and connection pooling.
 */
export function getHttpAgent(): http.Agent {
  if (!g.__renoHttpAgent) {
    g.__renoHttpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: POOL_CONNECTIONS,
      maxFreeSockets: 64,
      timeout: POOL_KEEP_ALIVE_TIMEOUT,
      scheduling: "fifo",
    });
  }
  return g.__renoHttpAgent;
}

/**
 * Returns a singleton HTTPS Agent with aggressive keep-alive and connection pooling.
 */
export function getHttpsAgent(): https.Agent {
  if (!g.__renoHttpsAgent) {
    g.__renoHttpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: POOL_CONNECTIONS,
      maxFreeSockets: 64,
      timeout: POOL_KEEP_ALIVE_TIMEOUT,
      scheduling: "fifo",
      // Allow self-signed certs in development
      ...(process.env.NODE_ENV === "development"
        ? { rejectUnauthorized: false }
        : {}),
    });
  }
  return g.__renoHttpsAgent;
}

/**
 * Gracefully close connection pool agents (useful for tests and shutdown).
 */
export function closeAgents(): void {
  if (g.__renoHttpAgent) {
    g.__renoHttpAgent.destroy();
    g.__renoHttpAgent = undefined;
  }
  if (g.__renoHttpsAgent) {
    g.__renoHttpsAgent.destroy();
    g.__renoHttpsAgent = undefined;
  }
}
