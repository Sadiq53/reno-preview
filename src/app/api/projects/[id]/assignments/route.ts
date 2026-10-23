import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { sendDeveloperAssignmentEmail } from "@/lib/brevo";
import { WpRoleTemplate } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_ROLE_TEMPLATES: WpRoleTemplate[] = [
  "RESTRICTED_ADMIN",
  "EDITOR",
  "SHOP_MANAGER",
];

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        clientName: true,
        targetUrl: true,
        status: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const assignments = await prisma.assignment.findMany({
      where: { projectId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const formattedAssignments = assignments.map((a) => {
      const isExpired = new Date(a.expiresAt) <= now;
      const isRevoked = a.revokedAt !== null;
      const isActive = !isRevoked && !isExpired && (a.user as any)?.status !== "SUSPENDED";

      return {
        id: a.id,
        projectId: a.projectId,
        userId: a.userId,
        user: a.user,
        wpRoleTemplate: a.wpRoleTemplate,
        expiresAt: a.expiresAt.toISOString(),
        revokedAt: a.revokedAt ? a.revokedAt.toISOString() : null,
        createdAt: a.createdAt.toISOString(),
        isActive,
        isExpired,
        isRevoked,
      };
    });

    const developers = await prisma.user.findMany({
      where: {
        role: "DEVELOPER",
        status: "ACTIVE", // Only active developers can be assigned
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      project,
      assignments: formattedAssignments,
      availableDevelopers: developers,
    });
  } catch (error: any) {
    console.error("[GET_PROJECT_ASSIGNMENTS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error fetching assignments", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { userId, wpRoleTemplate, expiresAt } = body;

    if (!userId) {
      return NextResponse.json({ error: "Developer user ID is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Developer not found" }, { status: 404 });
    }

    if (targetUser.status === "SUSPENDED") {
      return NextResponse.json(
        { error: `Cannot assign ${targetUser.name}: Account is currently suspended. Please reactivate their account first.` },
        { status: 400 }
      );
    }

    const roleTemplate: WpRoleTemplate = VALID_ROLE_TEMPLATES.includes(wpRoleTemplate)
      ? wpRoleTemplate
      : "RESTRICTED_ADMIN";

    if (!expiresAt) {
      return NextResponse.json({ error: "Expiration date is required" }, { status: 400 });
    }

    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return NextResponse.json({ error: "Expiration date must be a valid future timestamp" }, { status: 400 });
    }

    // Check if assignment exists (unique composite key [projectId, userId])
    const existing = await prisma.assignment.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId,
        },
      },
    });

    let assignment;
    let actionType = "ASSIGNMENT_CREATED";

    if (existing) {
      assignment = await prisma.assignment.update({
        where: { id: existing.id },
        data: {
          wpRoleTemplate: roleTemplate,
          expiresAt: expiryDate,
          revokedAt: null, // Reactivate if was revoked
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });
      actionType = "ASSIGNMENT_REACTIVATED";
    } else {
      assignment = await prisma.assignment.create({
        data: {
          projectId: id,
          userId,
          wpRoleTemplate: roleTemplate,
          expiresAt: expiryDate,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });
    }

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: actionType,
      metadata: {
        assignedUserId: targetUser.id,
        assignedUserEmail: targetUser.email,
        projectName: project.name,
        roleTemplate,
        expiresAt: expiryDate.toISOString(),
      },
    });

    // Notify assigned developer and project team
    await dispatchNotification({
      type: "PROJECT_ACCESS_GRANTED",
      title: "Project Access Granted",
      message: `You have been assigned to project "${project.name}" with ${roleTemplate.replace("_", " ")} access.`,
      link: `/developer/tasks?projectId=${id}`,
      projectId: id,
      userId: targetUser.id,
      includeAdmins: true,
      excludeUserId: session.user.id,
      metadata: {
        projectId: id,
        assignmentId: assignment.id,
        roleTemplate,
      },
    });

    // Auto-dispatch email via Brevo to developer
    try {
      const host =
        req.headers.get("x-forwarded-host") ||
        req.headers.get("host") ||
        process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
        "vanguard.crewvia.in";
      const protocol =
        req.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
      const portalUrl = `${protocol}://${host}/developer/tasks?projectId=${id}`;

      await sendDeveloperAssignmentEmail({
        developerEmail: targetUser.email,
        developerName: targetUser.name,
        projectName: project.name,
        portalUrl,
        wpRoleTemplate: roleTemplate,
        expiresAt: expiryDate,
      });
    } catch (emailErr) {
      console.error("[ASSIGNMENT_EMAIL_DISPATCH_FAILED]", emailErr);
    }

    return NextResponse.json(
      {
        message: "Developer assignment saved successfully",
        assignment: {
          id: assignment.id,
          projectId: assignment.projectId,
          userId: assignment.userId,
          user: assignment.user,
          wpRoleTemplate: assignment.wpRoleTemplate,
          expiresAt: assignment.expiresAt.toISOString(),
          revokedAt: assignment.revokedAt ? assignment.revokedAt.toISOString() : null,
          createdAt: assignment.createdAt.toISOString(),
          isActive: true,
          isExpired: false,
          isRevoked: false,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[CREATE_ASSIGNMENT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error creating assignment", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { assignmentId, expiresAt, wpRoleTemplate, revokeNow } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!assignment || assignment.projectId !== id) {
      return NextResponse.json({ error: "Assignment not found for this project" }, { status: 404 });
    }

    if (revokeNow) {
      const updated = await prisma.assignment.update({
        where: { id: assignmentId },
        data: { revokedAt: new Date() },
      });

      await recordAuditLog({
        userId: session.user.id,
        projectId: id,
        action: "ASSIGNMENT_REVOKED",
        metadata: {
          assignmentId,
          developerEmail: assignment.user.email,
          projectName: assignment.project.name,
        },
      });

      return NextResponse.json({
        message: "Assignment revoked successfully",
        assignment: updated,
      });
    }

    const updateData: any = {};

    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return NextResponse.json({ error: "New expiry date must be in the future" }, { status: 400 });
      }
      updateData.expiresAt = expiryDate;
      updateData.revokedAt = null; // Un-revoke if extending
    }

    if (wpRoleTemplate && VALID_ROLE_TEMPLATES.includes(wpRoleTemplate)) {
      updateData.wpRoleTemplate = wpRoleTemplate;
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "ASSIGNMENT_UPDATED",
      metadata: {
        assignmentId,
        developerEmail: assignment.user.email,
        projectName: assignment.project.name,
        updatedFields: updateData,
      },
    });

    const now = new Date();
    return NextResponse.json({
      message: "Assignment updated successfully",
      assignment: {
        id: updated.id,
        projectId: updated.projectId,
        userId: updated.userId,
        user: updated.user,
        wpRoleTemplate: updated.wpRoleTemplate,
        expiresAt: updated.expiresAt.toISOString(),
        revokedAt: updated.revokedAt ? updated.revokedAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        isActive: updated.revokedAt === null && new Date(updated.expiresAt) > now,
        isExpired: new Date(updated.expiresAt) <= now,
        isRevoked: updated.revokedAt !== null,
      },
    });
  } catch (error: any) {
    console.error("[PATCH_ASSIGNMENT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error updating assignment", details: error.message },
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

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment ID query param is required" }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!assignment || assignment.projectId !== id) {
      return NextResponse.json({ error: "Assignment not found for this project" }, { status: 404 });
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "ASSIGNMENT_DELETED",
      metadata: {
        assignmentId,
        developerEmail: assignment.user.email,
        projectName: assignment.project.name,
      },
    });

    return NextResponse.json({ message: "Assignment deleted permanently" });
  } catch (error: any) {
    console.error("[DELETE_ASSIGNMENT_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error deleting assignment", details: error.message },
      { status: 500 }
    );
  }
}
