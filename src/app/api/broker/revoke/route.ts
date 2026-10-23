import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { normalizeWpLoginUrl } from "@/lib/wp-session";
import { recordAuditLog } from "@/lib/audit";

interface RevokeRequestBody {
  assignmentId?: string;
  projectId?: string;
  domain?: string;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body: RevokeRequestBody = await req.json().catch(() => ({}));
    const { assignmentId, projectId } = body;

    if (!assignmentId && !projectId) {
      return NextResponse.json(
        { error: "Either assignmentId or projectId is required.", code: "PARAM_REQUIRED" },
        { status: 400 }
      );
    }

    const now = new Date();
    let targetAssignment: any = null;

    if (assignmentId) {
      targetAssignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          project: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      if (!targetAssignment) {
        return NextResponse.json(
          { error: "Assignment not found.", code: "ASSIGNMENT_NOT_FOUND" },
          { status: 404 }
        );
      }

      // Permissions: Admin can revoke any; Developer can only revoke their own
      if (
        session.user.role !== "ADMIN" &&
        targetAssignment.userId !== session.user.id
      ) {
        return NextResponse.json(
          { error: "Forbidden: You cannot revoke another user's assignment.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    } else if (projectId) {
      // If only projectId is provided
      if (session.user.role === "ADMIN") {
        // Admin revoking all assignments for a project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          return NextResponse.json(
            { error: "Project not found.", code: "PROJECT_NOT_FOUND" },
            { status: 404 }
          );
        }

        const { domain } = normalizeWpLoginUrl(project.targetUrl || "http://localhost");

        // Revoke all active assignments for this project
        await prisma.assignment.updateMany({
          where: { projectId: project.id, revokedAt: null },
          data: { revokedAt: now },
        });

        // Expire and wipe all login grants for this project's assignments
        const assignments = await prisma.assignment.findMany({
          where: { projectId: project.id },
          select: { id: true },
        });
        const assignmentIds = assignments.map((a) => a.id);

        await prisma.loginGrant.updateMany({
          where: { assignmentId: { in: assignmentIds } },
          data: {
            expiresAt: new Date(0),
            sessionDataEncrypted: null,
            sessionDataIv: null,
            sessionDataAuthTag: null,
          },
        });

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
        const userAgent = req.headers.get("user-agent") || "VanguardBroker/1.0";

        await recordAuditLog({
          userId: session.user.id,
          projectId: project.id,
          action: "WP_ALL_SESSIONS_REVOKED",
          ipAddress: ip,
          userAgent,
          metadata: {
            projectName: project.name,
            domain,
            revokedAt: now.toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          message: `All active assignments and sessions for project ${project.name} revoked.`,
          domain,
          targetUrl: project.targetUrl,
          revokedAt: now.toISOString(),
        });
      } else {
        // Developer revoking their own project assignment
        targetAssignment = await prisma.assignment.findFirst({
          where: {
            projectId,
            userId: session.user.id,
          },
          include: {
            project: true,
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        });

        if (!targetAssignment) {
          return NextResponse.json(
            { error: "No active assignment found for this project.", code: "NOT_FOUND" },
            { status: 404 }
          );
        }
      }
    }

    // 1. Mark target assignment as revoked
    const updated = await prisma.assignment.update({
      where: { id: targetAssignment.id },
      data: { revokedAt: now },
    });

    // 2. Invalidate all Login Grants for this assignment and wipe session data
    await prisma.loginGrant.updateMany({
      where: {
        assignmentId: targetAssignment.id,
      },
      data: {
        expiresAt: new Date(0),
        sessionDataEncrypted: null,
        sessionDataIv: null,
        sessionDataAuthTag: null,
      },
    });

    // 3. Resolve Domain for Cookie Clearing
    const { domain, baseUrl } = normalizeWpLoginUrl(targetAssignment.project.targetUrl);

    // 4. Record Centralized Immutable Audit Log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "RenoBroker/1.0";

    await recordAuditLog({
      userId: session.user.id,
      projectId: targetAssignment.projectId,
      action: "WP_SESSION_REVOKED",
      ipAddress: ip,
      userAgent,
      metadata: {
        assignmentId: targetAssignment.id,
        developerId: targetAssignment.userId,
        developerEmail: targetAssignment.user.email,
        projectName: targetAssignment.project.name,
        domain,
        revokedAt: now.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Access for ${targetAssignment.user.name} revoked immediately.`,
      assignmentId: targetAssignment.id,
      domain,
      targetUrl: targetAssignment.project.targetUrl,
      wpAdminUrl: `${baseUrl}/wp-admin/`,
      revokedAt: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[BROKER_REVOKE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to revoke assignment access.", details: error.message },
      { status: 500 }
    );
  }
}
