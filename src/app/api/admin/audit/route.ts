import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { queryAuditLogs } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Agency Admin access required.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const projectId = searchParams.get("projectId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { total, logs } = await queryAuditLogs({
      projectId,
      userId,
      action,
      search,
      startDate,
      endDate,
      limit,
      offset,
    });

    // Aggregate security statistics
    const [loginCount, revokeCount, sentinelBlockCount, totalProjects, totalUsers] =
      await Promise.all([
        prisma.auditLog.count({
          where: { action: { in: ["WP_LOGIN_GRANT_DISPATCHED", "WP_SESSION_CLAIMED", "WP_ADMIN_LAUNCHED"] } },
        }),
        prisma.auditLog.count({
          where: { action: { in: ["WP_SESSION_REVOKED", "WP_ALL_SESSIONS_REVOKED", "ASSIGNMENT_REVOKED"] } },
        }),
        prisma.auditLog.count({
          where: { action: "SECURITY_SENTINEL_BLOCKED" },
        }),
        prisma.project.findMany({
          select: { id: true, name: true, clientName: true },
          orderBy: { name: "asc" },
        }),
        prisma.user.findMany({
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: "asc" },
        }),
      ]);

    // Distinct actions present in system
    const distinctActions = await prisma.auditLog.groupBy({
      by: ["action"],
      _count: { action: true },
      orderBy: { _count: { action: "desc" } },
    });

    return NextResponse.json({
      success: true,
      total,
      limit,
      offset,
      logs,
      stats: {
        totalLogins: loginCount,
        totalRevocations: revokeCount,
        sentinelBlocks: sentinelBlockCount,
        totalEvents: total,
      },
      availableActions: distinctActions.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      filterOptions: {
        projects: totalProjects,
        users: totalUsers,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_AUDIT_QUERY_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve security audit logs.", details: error.message },
      { status: 500 }
    );
  }
}
