import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]),
});

/**
 * PATCH /api/comments/[id]/status
 * Updates task progression lifecycle: PENDING -> IN_PROGRESS -> RESOLVED.
 * Updates resolution audit timestamps and returns live project task progress metrics.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required to update task status." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = statusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid status value", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status } = parseResult.data;

    // Retrieve existing comment
    const existing = await prisma.comment.findUnique({
      where: { id },
      include: { page: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Comment annotation not found" },
        { status: 404 }
      );
    }

    // Role check: If DEVELOPER, must be actively assigned to this project
    if (session.user.role === "DEVELOPER") {
      const assignment = await prisma.assignment.findFirst({
        where: {
          projectId: existing.projectId,
          userId: session.user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!assignment) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    }

    const updateData: {
      status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
      resolvedAt: Date | null;
      resolvedByUserId: string | null;
    } = {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      resolvedByUserId: status === "RESOLVED" ? session.user.id : null,
    };

    const updated = await prisma.comment.update({
      where: { id },
      data: updateData,
      include: {
        authorUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        resolvedByUser: {
          select: { id: true, name: true, role: true },
        },
        page: {
          select: { id: true, path: true, title: true, fullUrl: true },
        },
        replies: {
          include: {
            authorUser: {
              select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Compute updated project task metrics
    const [total, resolved, inProgress, pending] = await Promise.all([
      prisma.comment.count({ where: { projectId: existing.projectId } }),
      prisma.comment.count({ where: { projectId: existing.projectId, status: "RESOLVED" } }),
      prisma.comment.count({ where: { projectId: existing.projectId, status: "IN_PROGRESS" } }),
      prisma.comment.count({ where: { projectId: existing.projectId, status: "PENDING" } }),
    ]);

    const progressPercent = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Determine audit action
    const auditAction =
      status === "RESOLVED"
        ? "TASK_RESOLVED"
        : status === "IN_PROGRESS"
        ? "TASK_IN_PROGRESS"
        : "TASK_REOPENED";

    await recordAuditLog({
      userId: session.user.id,
      projectId: existing.projectId,
      action: auditAction,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: {
        commentId: id,
        previousStatus: existing.status,
        newStatus: status,
        pagePath: existing.page?.path || "/",
        progressPercent,
      },
    });

    return NextResponse.json({
      comment: updated,
      projectMetrics: {
        total,
        resolved,
        inProgress,
        pending,
        progressPercent,
      },
    });
  } catch (error: any) {
    console.error("[TASK_STATUS_PATCH_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to update task status", details: error.message },
      { status: 500 }
    );
  }
}
