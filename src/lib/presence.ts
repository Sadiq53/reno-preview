/**
 * Crewvia Vanguard - Real-Time Developer WordPress Presence & Activity Tracker
 *
 * Tracks active developer sessions inside client WordPress admin environments.
 * A developer is ONLY considered active when they are actively working on an open
 * WP admin panel tab. When the tab is closed or focus lapses beyond 45 seconds,
 * presence automatically transitions to inactive with precise "last active" timestamps.
 */

export interface DeveloperPresenceRecord {
  assignmentId?: string;
  domain: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  device?: string;
  ipAddress?: string;
  tabCount: number;
  lastHeartbeatAt: number; // Date.now() timestamp
  closedAt?: number | null;
  isActive: boolean;
}

// Global in-memory presence map (persists across Next.js API route invocations in server process)
declare global {
  // eslint-disable-next-line no-var
  var __vanguardPresenceMap: Map<string, DeveloperPresenceRecord> | undefined;
}

if (!global.__vanguardPresenceMap) {
  global.__vanguardPresenceMap = new Map<string, DeveloperPresenceRecord>();
}

const presenceMap = global.__vanguardPresenceMap;

// Heartbeat validity window: 45 seconds
const PRESENCE_TTL_MS = 45 * 1000;

function getPresenceKey(domain?: string, assignmentId?: string, userId?: string): string {
  if (assignmentId) return `assignment_${assignmentId}`;
  if (domain && userId) return `domain_${domain.toLowerCase()}_user_${userId}`;
  if (domain) return `domain_${domain.toLowerCase()}`;
  return "unknown";
}

/**
 * Records an active heartbeat from an open WordPress admin tab
 */
export function recordPresenceHeartbeat({
  domain,
  assignmentId,
  userId,
  userEmail,
  userName,
  device,
  ipAddress,
  tabCount = 1,
}: {
  domain: string;
  assignmentId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  device?: string;
  ipAddress?: string;
  tabCount?: number;
}): DeveloperPresenceRecord {
  const cleanDomain = domain.toLowerCase().replace(/^\./, "").replace(/^www\./, "");
  const now = Date.now();

  const key = getPresenceKey(cleanDomain, assignmentId, userId);
  const existing = presenceMap.get(key);

  const updated: DeveloperPresenceRecord = {
    assignmentId: assignmentId || existing?.assignmentId,
    domain: cleanDomain,
    userId: userId || existing?.userId,
    userEmail: userEmail || existing?.userEmail,
    userName: userName || existing?.userName,
    device: device || existing?.device,
    ipAddress: ipAddress || existing?.ipAddress || "127.0.0.1",
    tabCount: Math.max(1, tabCount),
    lastHeartbeatAt: now,
    closedAt: null,
    isActive: true,
  };

  presenceMap.set(key, updated);

  // Also set domain-level fallback key if assignmentId was specified
  if (assignmentId) {
    presenceMap.set(`domain_${cleanDomain}`, updated);
  }

  return updated;
}

/**
 * Records that a developer closed their WordPress admin tab
 */
export function recordPresenceTabClosed({
  domain,
  assignmentId,
  userId,
  remainingTabs = 0,
}: {
  domain: string;
  assignmentId?: string;
  userId?: string;
  remainingTabs?: number;
}): DeveloperPresenceRecord | null {
  const cleanDomain = domain.toLowerCase().replace(/^\./, "").replace(/^www\./, "");
  const now = Date.now();
  const key = getPresenceKey(cleanDomain, assignmentId, userId);

  const existing = presenceMap.get(key) || presenceMap.get(`domain_${cleanDomain}`);
  if (!existing) return null;

  if (remainingTabs <= 0) {
    existing.tabCount = 0;
    existing.isActive = false;
    existing.closedAt = now;
  } else {
    existing.tabCount = remainingTabs;
    existing.lastHeartbeatAt = now;
  }

  presenceMap.set(key, existing);
  presenceMap.set(`domain_${cleanDomain}`, existing);
  return existing;
}

/**
 * Queries whether a developer is currently active in WordPress admin
 */
export function getDeveloperPresence({
  assignmentId,
  domain,
  userId,
}: {
  assignmentId?: string;
  domain?: string;
  userId?: string;
}): {
  isActive: boolean;
  lastActiveAt: Date | null;
  closedAt: Date | null;
  tabCount: number;
  ipAddress?: string;
  device?: string;
} {
  const cleanDomain = domain ? domain.toLowerCase().replace(/^\./, "").replace(/^www\./, "") : undefined;
  const now = Date.now();

  let record: DeveloperPresenceRecord | undefined;
  if (assignmentId) {
    record = presenceMap.get(`assignment_${assignmentId}`);
  }
  if (!record && cleanDomain && userId) {
    record = presenceMap.get(`domain_${cleanDomain}_user_${userId}`);
  }
  if (!record && cleanDomain) {
    record = presenceMap.get(`domain_${cleanDomain}`);
  }

  if (!record) {
    return {
      isActive: false,
      lastActiveAt: null,
      closedAt: null,
      tabCount: 0,
    };
  }

  // Active check:
  // Must be marked active, closedAt must NOT be set, and last heartbeat must be within 45s
  const isHeartbeatFresh = now - record.lastHeartbeatAt < PRESENCE_TTL_MS;
  const isActuallyActive = record.isActive && !record.closedAt && isHeartbeatFresh && record.tabCount > 0;

  const lastActiveTimestamp = record.closedAt || record.lastHeartbeatAt;

  return {
    isActive: isActuallyActive,
    lastActiveAt: lastActiveTimestamp ? new Date(lastActiveTimestamp) : null,
    closedAt: record.closedAt ? new Date(record.closedAt) : null,
    tabCount: isActuallyActive ? record.tabCount : 0,
    ipAddress: record.ipAddress,
    device: record.device,
  };
}

/**
 * Human-readable friendly time ago formatter (e.g. "Just now", "2 minutes ago", "3 hours ago")
 */
export function formatFriendlyTimeAgo(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "Never";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Unknown";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
