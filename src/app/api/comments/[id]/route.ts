import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { z } from "zod";

const updateCommentSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]).optional(),
  content: z.string().trim().min(1).optional(),
  notes: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

/**
 * PATCH /api/comments/[id]
 * Updates comment status (task progression), notes, priority, or content.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

    const parseResult = updateCommentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, content, notes, priority } = parseResult.data;

    const existing = await prisma.comment.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Role verification: If DEVELOPER, must be assigned to this project
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
          { error: "Access denied. You are not assigned to this project." },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (content !== undefined) {
      updateData.content = content;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (status !== undefined) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedByUserId = session?.user?.id || null;
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedByUserId = null;
      }
    }

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
        project: {
          select: { id: true, name: true, clientName: true, targetUrl: true },
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

    await recordAuditLog({
      userId: session?.user?.id || null,
      projectId: existing.projectId,
      action: status ? `COMMENT_STATUS_${status}` : "COMMENT_UPDATED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: { commentId: id, previousStatus: existing.status, newStatus: status },
    });

    // Realtime notification dispatch on task status progression
    if (status && status !== existing.status) {
      const actorName = session?.user?.name || "Team Member";
      const snippet = (existing.content || "Task").slice(0, 50);

      if (status === "IN_PROGRESS") {
        await dispatchNotification({
          type: "TASK_STARTED",
          title: "Developer Started Working",
          message: `${actorName} started working on "${snippet}..."`,
          link: `/preview/${existing.projectId}?commentId=${id}`,
          projectId: existing.projectId,
          excludeUserId: session?.user?.id,
          metadata: { commentId: id, status: "IN_PROGRESS" },
        });
      } else if (status === "RESOLVED") {
        await dispatchNotification({
          type: "TASK_RESOLVED",
          title: "Task Resolved & Completed",
          message: `${actorName} completed & resolved: "${snippet}..."`,
          link: `/preview/${existing.projectId}?commentId=${id}`,
          projectId: existing.projectId,
          excludeUserId: session?.user?.id,
          metadata: { commentId: id, status: "RESOLVED" },
        });
      }
    }

    return NextResponse.json({ comment: updated });
  } catch (error: any) {
    console.error("[COMMENT_PATCH_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to update comment", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/[id]
 * Deletes a comment pin and all its replies.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    const existing = await prisma.comment.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Role check: Only ADMIN or the author can delete
    const isOwner = session?.user?.id && existing.authorUserId === session.user.id;
    const isAdmin = session?.user?.role === "ADMIN";

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized. You cannot delete this comment." },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id },
    });

    await recordAuditLog({
      userId: session?.user?.id || null,
      projectId: existing.projectId,
      action: "COMMENT_DELETED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: { commentId: id, pageId: existing.pageId },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[COMMENT_DELETE_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to delete comment", details: error.message },
      { status: 500 }
    );
  }
}
