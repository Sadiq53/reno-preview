/**
 * Reno Hub Reverse Proxy — Session Manager (Phase 8: Pre-warming + Proactive Refresh)
 *
 * Manages authenticated WordPress session lifecycle:
 * - In-memory session cookie cache (2-hour TTL)
 * - In-memory project record cache (5-minute TTL)
 * - Background session pre-warming on first access
 * - Proactive session refresh 15 minutes before expiry
 * - Session health monitoring and auto-recovery
 *
 * Pre-warming eliminates the 2-15s cold start login delay:
 * 1. First request → cache miss → authenticate synchronously (unavoidable)
 * 2. Schedule background refresh before expiry
 * 3. All subsequent requests hit warm cache → <1ms session lookup
 */

import type { SessionCacheEntry, ProjectCacheEntry, ProjectRecord } from "./types";
import { SESSION_CACHE_TTL, PROJECT_CACHE_TTL, SESSION_REFRESH_AHEAD } from "./config";

// ─── Global Caches (persist across HMR) ──────────────────────────────────────

const g = globalThis as unknown as {
  __renoSessionCache?: Map<string, SessionCacheEntry>;
  __renoProjectCache?: Map<string, ProjectCacheEntry>;
  __renoRefreshTimers?: Map<string, NodeJS.Timeout>;
  __renoPrewarmQueue?: Set<string>;
};

const sessionCache =
  g.__renoSessionCache ||
  (g.__renoSessionCache = new Map<string, SessionCacheEntry>());

const projectCache =
  g.__renoProjectCache ||
  (g.__renoProjectCache = new Map<string, ProjectCacheEntry>());

const refreshTimers =
  g.__renoRefreshTimers ||
  (g.__renoRefreshTimers = new Map<string, NodeJS.Timeout>());

const prewarmInProgress =
  g.__renoPrewarmQueue ||
  (g.__renoPrewarmQueue = new Set<string>());

// ─── Session Cache ───────────────────────────────────────────────────────────

/**
 * Retrieve a cached session cookie header for a project.
 * Returns null if not cached or expired.
 */
export function getCachedSession(projectId: string): string | null {
  const cached = sessionCache.get(projectId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.cookieHeader;
  }
  return null;
}

/**
 * Store a session cookie header in the cache and schedule proactive refresh.
 */
export function setCachedSession(
  projectId: string,
  cookieHeader: string,
  ttlMs: number = SESSION_CACHE_TTL
): void {
  sessionCache.set(projectId, {
    cookieHeader,
    expiresAt: Date.now() + ttlMs,
  });

  // Schedule proactive refresh before expiry
  scheduleProactiveRefresh(projectId, ttlMs);
}

/**
 * Invalidate a cached session (e.g., when credentials are updated).
 */
export function invalidateSession(projectId: string): void {
  sessionCache.delete(projectId);
  cancelRefreshTimer(projectId);
}

/**
 * Check if a session is nearing expiry and should be refreshed proactively.
 */
export function isSessionNearingExpiry(projectId: string): boolean {
  const cached = sessionCache.get(projectId);
  if (!cached) return true;
  return cached.expiresAt - Date.now() < SESSION_REFRESH_AHEAD;
}

/**
 * Get session cache stats for monitoring.
 */
export function getSessionCacheStats(): {
  size: number;
  entries: Array<{ projectId: string; expiresIn: number; nearingExpiry: boolean }>;
  refreshTimersActive: number;
  prewarmInProgress: number;
} {
  const now = Date.now();
  const entries = Array.from(sessionCache.entries()).map(
    ([projectId, entry]) => ({
      projectId,
      expiresIn: Math.max(0, entry.expiresAt - now),
      nearingExpiry: entry.expiresAt - now < SESSION_REFRESH_AHEAD,
    })
  );
  return {
    size: sessionCache.size,
    entries,
    refreshTimersActive: refreshTimers.size,
    prewarmInProgress: prewarmInProgress.size,
  };
}

// ─── Proactive Session Refresh ───────────────────────────────────────────────

/**
 * Callback type for session refresh. Accepts projectId, returns new cookie header
 * or null on failure. This is set by the route handler at startup.
 */
type RefreshCallback = (projectId: string) => Promise<string | null>;

let sessionRefreshCallback: RefreshCallback | null = null;

/**
 * Register the session refresh callback. Called once by the route handler
 * to provide the authentication logic without circular dependencies.
 */
export function registerRefreshCallback(callback: RefreshCallback): void {
  sessionRefreshCallback = callback;
}

/**
 * Schedule a background refresh for a session before it expires.
 * The refresh runs SESSION_REFRESH_AHEAD ms before expiry.
 */
function scheduleProactiveRefresh(projectId: string, ttlMs: number): void {
  // Cancel any existing timer for this project
  cancelRefreshTimer(projectId);

  // Schedule refresh at (TTL - REFRESH_AHEAD) from now
  const refreshDelay = Math.max(ttlMs - SESSION_REFRESH_AHEAD, 60_000); // min 1 minute

  const timer = setTimeout(async () => {
    refreshTimers.delete(projectId);

    if (!sessionRefreshCallback) return;
    if (prewarmInProgress.has(projectId)) return; // Already refreshing

    prewarmInProgress.add(projectId);
    try {
      const newCookieHeader = await sessionRefreshCallback(projectId);
      if (newCookieHeader) {
        // Update cache without re-scheduling (setCachedSession does it)
        sessionCache.set(projectId, {
          cookieHeader: newCookieHeader,
          expiresAt: Date.now() + SESSION_CACHE_TTL,
        });
        scheduleProactiveRefresh(projectId, SESSION_CACHE_TTL);
        console.info(`🔄 [SESSION_REFRESH] Proactively refreshed session for project ${projectId}`);
      } else {
        console.warn(`⚠️ [SESSION_REFRESH_FAIL] Could not refresh session for ${projectId}`);
      }
    } catch (err) {
      console.warn(`⚠️ [SESSION_REFRESH_ERROR] ${projectId}:`, err);
    } finally {
      prewarmInProgress.delete(projectId);
    }
  }, refreshDelay);

  // Prevent timer from blocking Node.js shutdown
  if (timer.unref) timer.unref();
  refreshTimers.set(projectId, timer);
}

/**
 * Cancel a scheduled refresh timer.
 */
function cancelRefreshTimer(projectId: string): void {
  const existing = refreshTimers.get(projectId);
  if (existing) {
    clearTimeout(existing);
    refreshTimers.delete(projectId);
  }
}

// ─── Pre-warming ─────────────────────────────────────────────────────────────

/**
 * Trigger a non-blocking background session warm-up for a project.
 * Called when a user navigates to a project for the first time.
 * Does NOT block the current request — uses fire-and-forget pattern.
 */
export function triggerBackgroundPrewarm(projectId: string): void {
  if (!sessionRefreshCallback) return;
  if (getCachedSession(projectId)) return; // Already warm
  if (prewarmInProgress.has(projectId)) return; // Already warming

  prewarmInProgress.add(projectId);

  // Fire and forget — don't await
  sessionRefreshCallback(projectId)
    .then((cookieHeader) => {
      if (cookieHeader) {
        setCachedSession(projectId, cookieHeader);
        console.info(`🔥 [SESSION_PREWARM] Pre-warmed session for project ${projectId}`);
      }
    })
    .catch((err) => {
      console.warn(`⚠️ [SESSION_PREWARM_FAIL] ${projectId}:`, err);
    })
    .finally(() => {
      prewarmInProgress.delete(projectId);
    });
}

// ─── Project Cache ───────────────────────────────────────────────────────────

/**
 * Retrieve a cached project record.
 * Returns null if not cached or expired.
 */
export function getCachedProject(cacheKey: string): ProjectRecord | null {
  const cached = projectCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.project;
  }
  return null;
}

/**
 * Store a project record in the cache.
 */
export function setCachedProject(
  cacheKey: string,
  project: ProjectRecord,
  ttlMs: number = PROJECT_CACHE_TTL
): void {
  projectCache.set(cacheKey, {
    project,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Build a cache key for a project+user combination.
 */
export function buildProjectCacheKey(
  projectId: string,
  userId: string,
  role: string
): string {
  return `${projectId}:${userId}:${role}`;
}

/**
 * Invalidate all cached data for a project.
 */
export function invalidateProject(projectId: string): void {
  for (const key of projectCache.keys()) {
    if (key.startsWith(`${projectId}:`)) {
      projectCache.delete(key);
    }
  }
  invalidateSession(projectId);
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Purge all expired entries from both caches (call periodically).
 */
export function purgeExpiredEntries(): { sessions: number; projects: number } {
  const now = Date.now();
  let sessions = 0;
  let projects = 0;

  for (const [key, entry] of sessionCache) {
    if (entry.expiresAt <= now) {
      sessionCache.delete(key);
      cancelRefreshTimer(key);
      sessions++;
    }
  }

  for (const [key, entry] of projectCache) {
    if (entry.expiresAt <= now) {
      projectCache.delete(key);
      projects++;
    }
  }

  return { sessions, projects };
}
