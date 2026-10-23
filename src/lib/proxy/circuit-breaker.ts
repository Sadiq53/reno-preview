/**
 * Reno Hub Reverse Proxy — Per-Origin Circuit Breaker
 *
 * Prevents cascading failures when an upstream WordPress site goes down
 * or becomes unresponsive. Each origin gets its own independent circuit
 * so one failing client site doesn't affect others.
 *
 * State Machine: CLOSED → (failures > threshold) → OPEN → (timeout) → HALF_OPEN → (success) → CLOSED
 *                                                                      ↘ (failure) → OPEN
 */

import type { BreakerState } from "./types";
import {
  CB_FAILURE_THRESHOLD,
  CB_RESET_TIMEOUT,
  CB_HALF_OPEN_MAX,
  CB_REQUEST_TIMEOUT,
  RETRY_MAX_ATTEMPTS,
  RETRY_BASE_DELAY,
  RETRY_MAX_JITTER,
} from "./config";

// ─── Global State (persists across hot reloads) ──────────────────────────────

const g = globalThis as unknown as {
  __renoCircuitBreakers?: Map<string, BreakerState>;
};
const breakers =
  g.__renoCircuitBreakers ||
  (g.__renoCircuitBreakers = new Map<string, BreakerState>());

// ─── Errors ──────────────────────────────────────────────────────────────────

export class CircuitOpenError extends Error {
  public readonly origin: string;
  public readonly retryAfterMs: number;

  constructor(origin: string, retryAfterMs: number) {
    super(
      `Circuit breaker OPEN for ${origin}. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`
    );
    this.name = "CircuitOpenError";
    this.origin = origin;
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Core Circuit Breaker ────────────────────────────────────────────────────

function getBreaker(origin: string): BreakerState {
  let breaker = breakers.get(origin);
  if (!breaker) {
    breaker = {
      state: "CLOSED",
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      requestCount: 0,
    };
    breakers.set(origin, breaker);
  }
  return breaker;
}

function recordFailure(origin: string): void {
  const breaker = getBreaker(origin);
  breaker.failureCount++;
  breaker.lastFailureTime = Date.now();
  breaker.requestCount++;

  if (
    breaker.failureCount >= CB_FAILURE_THRESHOLD &&
    breaker.state !== "OPEN"
  ) {
    breaker.state = "OPEN";
    console.warn(
      `⚡ [CIRCUIT_OPEN] Origin ${origin} tripped after ${breaker.failureCount} failures`
    );
  }
}

function recordSuccess(origin: string): void {
  const breaker = getBreaker(origin);
  breaker.requestCount++;

  if (breaker.state === "HALF_OPEN") {
    breaker.successCount++;
    if (breaker.successCount >= CB_HALF_OPEN_MAX) {
      breaker.state = "CLOSED";
      breaker.failureCount = 0;
      breaker.successCount = 0;
      console.info(`✅ [CIRCUIT_CLOSED] Origin ${origin} recovered`);
    }
  } else {
    // In CLOSED state, reset failure count on success
    breaker.failureCount = 0;
  }
}

/**
 * Execute a fetch request through the circuit breaker for the given origin.
 *
 * - If circuit is CLOSED: execute normally
 * - If circuit is OPEN and timeout has passed: transition to HALF_OPEN, allow test request
 * - If circuit is OPEN and timeout hasn't passed: throw CircuitOpenError immediately
 *
 * @param origin  - Upstream origin (e.g. `https://client-site.com`)
 * @param url     - Full upstream URL to fetch
 * @param options - Fetch options (method, headers, body, dispatcher)
 * @returns Upstream Response
 */
export async function fetchWithCircuitBreaker(
  origin: string,
  url: string,
  options: RequestInit
): Promise<Response> {
  const breaker = getBreaker(origin);

  // ── Check circuit state ───────────────────────────────────────────────
  if (breaker.state === "OPEN") {
    const elapsed = Date.now() - breaker.lastFailureTime;
    if (elapsed >= CB_RESET_TIMEOUT) {
      breaker.state = "HALF_OPEN";
      breaker.successCount = 0;
      console.info(
        `🔄 [CIRCUIT_HALF_OPEN] Testing recovery for ${origin}`
      );
    } else {
      throw new CircuitOpenError(origin, CB_RESET_TIMEOUT - elapsed);
    }
  }

  // ── Execute with timeout ──────────────────────────────────────────────
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CB_REQUEST_TIMEOUT);

  // Merge abort signals (caller may have their own)
  const mergedSignal = controller.signal;

  try {
    const response = await fetch(url, {
      ...options,
      signal: mergedSignal,
    });

    clearTimeout(timeout);

    // 5xx responses count as failures
    if (response.status >= 500) {
      recordFailure(origin);
    } else {
      recordSuccess(origin);
    }

    return response;
  } catch (err: unknown) {
    clearTimeout(timeout);
    recordFailure(origin);
    throw err;
  }
}

/**
 * Execute a fetch with retry + exponential backoff + jitter,
 * wrapped inside the circuit breaker.
 *
 * Only retries on network errors and 5xx responses.
 * Does NOT retry on 4xx (client errors) or circuit-open rejections.
 */
export async function fetchWithRetry(
  origin: string,
  url: string,
  options: RequestInit
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithCircuitBreaker(origin, url, options);

      // Don't retry on 4xx or successful responses
      if (response.status < 500) {
        return response;
      }

      // 5xx: retry if attempts remain
      if (attempt < RETRY_MAX_ATTEMPTS) {
        const delay =
          RETRY_BASE_DELAY * Math.pow(2, attempt) +
          Math.random() * RETRY_MAX_JITTER;
        await sleep(delay);
        continue;
      }

      // Last attempt: return whatever we got
      return response;
    } catch (err) {
      lastError = err;

      // Don't retry on circuit-open (it would just fail again immediately)
      if (err instanceof CircuitOpenError) {
        throw err;
      }

      // Don't retry on abort (likely our own timeout)
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }

      // Network error: retry with backoff
      if (attempt < RETRY_MAX_ATTEMPTS) {
        const delay =
          RETRY_BASE_DELAY * Math.pow(2, attempt) +
          Math.random() * RETRY_MAX_JITTER;
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError;
}

/**
 * Get the current circuit breaker status for an origin (for metrics/admin API).
 */
export function getBreakerStatus(
  origin: string
): BreakerState & { origin: string } {
  const breaker = getBreaker(origin);
  return { ...breaker, origin };
}

/**
 * Get all circuit breaker statuses (for admin dashboard).
 */
export function getAllBreakerStatuses(): Array<
  BreakerState & { origin: string }
> {
  return Array.from(breakers.entries()).map(([origin, state]) => ({
    ...state,
    origin,
  }));
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
