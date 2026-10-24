import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { normalizeWpLoginUrl } from "@/lib/wp-session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Parses user agent into a clean human-readable device and browser description
 */
function parseDeviceFromUserAgent(ua: string = ""): {
  device: string;
  browser: string;
  os: string;
  isCompanionExtension: boolean;
} {
  const isCompanionExtension = ua.includes("RenoCompanionExtension") || ua.includes("VanguardExtension");

  let os = "Desktop";
  if (/windows phone/i.test(ua)) os = "Windows Phone";
  else if (/win(dows|98|nt|2000|xp|7|8|10|11)/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac(intosh|_os_x)/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/cros/i.test(ua)) os = "ChromeOS";

  let browser = "Browser";
  if (isCompanionExtension) browser = "Vanguard Extension";
  else if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/opr|opera/i.test(ua)) browser = "Opera";

  const device = `${browser} on ${os}`;
  return { device, browser, os, isCompanionExtension };
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, targetUrl: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Role check: Admin can view all; developer can view only their own sessions
    const isAdmin = session.user.role === "ADMIN";

    const whereClause: any = {
      assignment: {
        projectId,
        ...(isAdmin ? {} : { userId: session.user.id }),
      },
    };

    const grants = await prisma.loginGrant.findMany({
      where: whereClause,
      include: {
        assignment: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Fetch related audit logs for IP and UserAgent details
    const grantIds = grants.map((g) => g.id);
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        projectId,
        action: {
          in: ["WP_LOGIN_GRANT_DISPATCHED", "WP_SESSION_CLAIMED", "WP_SESSION_REVOKED"],
        },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    const now = new Date();

    const formattedSessions = grants.map((grant) => {
      // Find matching audit log for this grant or user
      const matchingLog = auditLogs.find((l) => {
        const meta = l.metadata as any;
        return meta?.grantId === grant.id || l.userId === grant.assignment.userId;
      });

      const userAgent = matchingLog?.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124";
      const ipAddress = matchingLog?.ipAddress || "127.0.0.1";
      const { device, browser, os, isCompanionExtension } = parseDeviceFromUserAgent(userAgent);

      const isAssignmentRevoked = grant.assignment.revokedAt !== null;
      const isAssignmentExpired = now > new Date(grant.assignment.expiresAt);
      const isGrantRevoked =
        grant.expiresAt.getTime() === 0 ||
        (grant.sessionDataEncrypted === null && grant.usedAt !== null);
      const isUsed = grant.usedAt !== null;

      // Status determination
      let status: "ACTIVE" | "PENDING_DISPATCH" | "CONSUMED" | "EXPIRED" | "REVOKED";
      if (isAssignmentRevoked || isGrantRevoked) {
        status = "REVOKED";
      } else if (isAssignmentExpired) {
        status = "EXPIRED";
      } else if (isUsed) {
        // Considered active within 12 hours of use
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        if (new Date(grant.usedAt!) > twelveHoursAgo) {
          status = "ACTIVE";
        } else {
          status = "CONSUMED";
        }
      } else if (now <= new Date(grant.expiresAt)) {
        status = "PENDING_DISPATCH";
      } else {
        status = "EXPIRED";
      }

      return {
        id: grant.id,
        assignmentId: grant.assignmentId,
        developer: {
          id: grant.assignment.user.id,
          name: grant.assignment.user.name,
          email: grant.assignment.user.email,
          avatarUrl: grant.assignment.user.avatarUrl,
          role: grant.assignment.user.role,
        },
        isCurrentUser: grant.assignment.user.id === session.user.id,
        isAdmin: grant.assignment.user.role === "ADMIN",
        wpRoleTemplate: grant.assignment.wpRoleTemplate,
        status,
        device,
        browser,
        os,
        isCompanionExtension,
        ipAddress,
        createdAt: grant.createdAt.toISOString(),
        usedAt: grant.usedAt ? grant.usedAt.toISOString() : null,
        expiresAt: grant.expiresAt.toISOString(),
        assignmentExpiresAt: grant.assignment.expiresAt.toISOString(),
      };
    });

    // Aggregate statistics
    const developerSessions = formattedSessions.filter((s) => s.developer.role === "DEVELOPER");
    const adminSessions = formattedSessions.filter((s) => s.developer.role === "ADMIN");

    const stats = {
      totalGrants: formattedSessions.length,
      activeSessions: formattedSessions.filter((s) => s.status === "ACTIVE").length,
      pendingDispatches: formattedSessions.filter((s) => s.status === "PENDING_DISPATCH").length,
      uniqueDevelopers: Array.from(new Set(developerSessions.map((s) => s.developer.id))).length,
      adminSessionsCount: adminSessions.length,
      revokedCount: formattedSessions.filter((s) => s.status === "REVOKED").length,
    };

    return NextResponse.json({
      sessions: formattedSessions,
      stats,
      currentUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      project: { id: project.id, name: project.name },
    });
  } catch (error: any) {
    console.error("[PROJECT_SESSIONS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch login sessions", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const grantId = searchParams.get("grantId");
    const purgeAll = searchParams.get("purge") === "true";
    const assignmentId = searchParams.get("assignmentId");

    const now = new Date();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "RenoAdmin/1.0";

    // Scenario 1: Purge ALL active WP sessions for this project (without unassigning developers)
    if (purgeAll) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, targetUrl: true, name: true },
      });

      const assignments = await prisma.assignment.findMany({
        where: { projectId },
        select: { id: true },
      });
      const assignmentIds = assignments.map((a) => a.id);

      // Expire and wipe all login grants immediately
      const result = await prisma.loginGrant.updateMany({
        where: {
          assignmentId: { in: assignmentIds },
        },
        data: {
          expiresAt: new Date(0),
          sessionDataEncrypted: null,
          sessionDataIv: null,
          sessionDataAuthTag: null,
        },
      });

      let domain = "";
      if (project?.targetUrl) {
        try {
          domain = normalizeWpLoginUrl(project.targetUrl).domain;
        } catch {}
      }

      await recordAuditLog({
        userId: session.user.id,
        projectId,
        action: "WP_ALL_SESSIONS_PURGED",
        ipAddress: ip,
        userAgent,
        metadata: {
          purgedAt: now.toISOString(),
          purgedCount: result.count,
          domain,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully purged ${result.count} WordPress session(s) across all accounts for this project.`,
        purgedCount: result.count,
        domain,
      });
    }

    // Scenario 2: Revoke single session grant (expire WP session immediately without kicking from project)
    if (grantId) {
      const grant = await prisma.loginGrant.findUnique({
        where: { id: grantId },
        include: {
          assignment: {
            include: { user: true, project: true },
          },
        },
      });

      if (!grant || grant.assignment.projectId !== projectId) {
        return NextResponse.json({ error: "Session grant not found for this project" }, { status: 404 });
      }

      // Mark the grant as revoked (epoch timestamp + wipe session data)
      await prisma.loginGrant.update({
        where: { id: grantId },
        data: {
          expiresAt: new Date(0),
          sessionDataEncrypted: null,
          sessionDataIv: null,
          sessionDataAuthTag: null,
        },
      });

      let domain = "";
      if (grant.assignment.project.targetUrl) {
        try {
          domain = normalizeWpLoginUrl(grant.assignment.project.targetUrl).domain;
        } catch {}
      }

      await recordAuditLog({
        userId: session.user.id,
        projectId,
        action: "WP_SESSION_REVOKED",
        ipAddress: ip,
        userAgent,
        metadata: {
          grantId,
          assignmentId: grant.assignmentId,
          developerName: grant.assignment.user.name,
          developerEmail: grant.assignment.user.email,
          domain,
          revokedAt: now.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Session grant for ${grant.assignment.user.name} revoked successfully.`,
        domain,
        assignmentId: grant.assignmentId,
      });
    }

    // Scenario 3: Revoke all grants for a specific assignment
    if (assignmentId) {
      const result = await prisma.loginGrant.updateMany({
        where: { assignmentId },
        data: {
          expiresAt: now,
          sessionDataEncrypted: null,
          sessionDataIv: null,
          sessionDataAuthTag: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Revoked all sessions for assignment.`,
        revokedCount: result.count,
      });
    }

    return NextResponse.json(
      { error: "Missing parameter: specify ?grantId=UUID or ?purge=true" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[PROJECT_SESSIONS_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to revoke session", details: error.message },
      { status: 500 }
    );
  }
}
