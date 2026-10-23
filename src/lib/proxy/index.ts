/**
 * Reno Hub Reverse Proxy — Module Index
 *
 * Re-exports all proxy pipeline modules for clean imports:
 *   import { getProxyAgent, classifyRequest, ... } from "@/lib/proxy";
 */

// Types
export type {
  ProxyContext,
  ProjectRecord,
  AssetClassification,
  AssetType,
  BreakerState,
  CircuitState,
  SessionCacheEntry,
  ProjectCacheEntry,
  ProxyMetrics,
  BuilderPatch,
} from "./types";

// Configuration
export * from "./config";

// Connection Pool
export { getHttpAgent, getHttpsAgent, closeAgents } from "./connection-pool";

// Circuit Breaker
export {
  fetchWithCircuitBreaker,
  fetchWithRetry,
  CircuitOpenError,
  getBreakerStatus,
  getAllBreakerStatuses,
} from "./circuit-breaker";

// Session Manager
export {
  getCachedSession,
  setCachedSession,
  invalidateSession,
  isSessionNearingExpiry,
  getSessionCacheStats,
  getCachedProject,
  setCachedProject,
  buildProjectCacheKey,
  invalidateProject,
  registerRefreshCallback,
  triggerBackgroundPrewarm,
  purgeExpiredEntries,
} from "./session-manager";

// URL Resolver
export {
  resolveSubpath,
  normalizeSubpath,
  buildUpstreamUrl,
  isAdminPath,
} from "./url-resolver";

// Header Forge
export { forgeRequestHeaders, forgeResponseHeaders } from "./header-forge";

// Security Sentinel
export { isSentinelBlocked, renderSentinelBlockedHtml } from "./security-sentinel";

// Asset Pipeline
export { classifyRequest, isBuilderEditMode } from "./asset-pipeline";

// HTML Rewriter
export { createHTMLRewriteStream, rewriteHTMLBuffered } from "./html-rewriter";

// Redirect Handler
export { handleRedirects } from "./redirect-handler";

// Bridge Injector
export {
  generateBridgeScript,
  generateSentinelCSS,
  generateProxyBanner,
  generateBaseTag,
} from "./bridge-injector";

// Builder Compatibility
export {
  generateBuilderPatches,
  detectBuilders,
  BUILDER_PATCHES,
} from "./builder-compat";

// Error Renderer
export {
  renderProxyErrorHtml,
  renderCircuitOpenHtml,
  renderCredentialsMissingHtml,
  renderMockWordPressAdmin,
} from "./error-renderer";

// Metrics
export {
  metrics,
  recordRequest,
  recordError,
  recordCacheHit,
  recordCacheMiss,
  recordCircuitTrip,
  getMetricsSnapshot,
} from "./metrics";

// Response Cache (Two-Tier: L1 In-Memory + L2 Redis)
export {
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
  invalidateProjectCache,
  getResponseCacheStats,
} from "./response-cache";
