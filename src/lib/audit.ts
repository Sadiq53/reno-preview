import prisma from "@/lib/db";

export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "CREDENTIALS_VAULTED"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_UPDATED"
  | "ASSIGNMENT_REVOKED"
  | "ASSIGNMENT_DELETED"
  | "WP_LOGIN_GRANT_DISPATCHED"
  | "WP_SESSION_CLAIMED"
  | "WP_SESSION_REVOKED"
  | "WP_ALL_SESSIONS_REVOKED"
  | "WP_LOGIN_FAILED"
  | "WP_ADMIN_LAUNCHED"
  | "EXPIRED_ACCESS_ATTEMPT"
  | "SECURITY_SENTINEL_BLOCKED"
  | "SHARE_LINK_CREATED"
  | "SHARE_LINK_ACCESSED"
  | "SHARE_LINK_REVOKED"
  | "COMMENT_CREATED"
  | "COMMENT_RESOLVED"
  | "COMMENT_DELETED"
  | string;

export interface AuditLogParams {
  userId?: string | null;
  projectId?: string | null;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQueryFilters {
  projectId?: string;
  userId?: string;
  action?: string;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number;
  offset?: number;
}

/**
 * Extracts client IP address and user-agent string from incoming HTTP request.
 */
export function extractRequestMeta(req: Request): { ipAddress: string; userAgent: string } {
  let ipAddress = "127.0.0.1";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    ipAddress = forwarded.split(",")[0].trim();
  } else {
    const realIp = req.headers.get("x-real-ip");
    if (realIp) ipAddress = realIp.trim();
  }

  const userAgent = req.headers.get("user-agent") || "Browser/Unknown";
  return { ipAddress, userAgent };
}

/**
 * Centrally records immutable audit log rows for security, authentication, and project changes.
 */
export async function recordAuditLog({
  userId,
  projectId,
  action,
  ipAddress = "127.0.0.1",
  userAgent = "Server/Internal",
  metadata,
}: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        projectId: projectId || null,
        action,
        ipAddress,
        userAgent,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch (error) {
    // Audit failure should be logged to stderr but not crash caller flow
    console.error(`[AUDIT_ERROR] Failed to record action "${action}":`, error);
    return null;
  }
}

/**
 * Queries audit logs with granular filtering, search, and pagination.
 */
export async function queryAuditLogs(filters: AuditLogQueryFilters = {}) {
  const {
    projectId,
    userId,
    action,
    search,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const where: any = {};

  if (projectId) {
    where.projectId = projectId;
  }

  if (userId) {
    where.userId = userId;
  }

  if (action && action !== "ALL") {
    where.action = action;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = new Date(startDate);
    }
    if (endDate) {
      where.timestamp.lte = new Date(endDate);
    }
  }

  if (search && search.trim().length > 0) {
    const query = search.trim();
    where.OR = [
      { action: { contains: query, mode: "insensitive" } },
      { ipAddress: { contains: query } },
      { userAgent: { contains: query, mode: "insensitive" } },
      { project: { name: { contains: query, mode: "insensitive" } } },
      { user: { name: { contains: query, mode: "insensitive" } } },
      { user: { email: { contains: query, mode: "insensitive" } } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            targetUrl: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: Math.min(limit, 100),
      skip: Math.max(0, offset),
    }),
  ]);

  return {
    total,
    logs,
    limit,
    offset,
  };
}
