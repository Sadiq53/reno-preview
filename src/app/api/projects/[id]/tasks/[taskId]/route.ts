import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

const updateTaskSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]).optional(),
  title: z.string().trim().optional(),
  content: z.string().trim().optional(),
  notes: z.string().trim().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeUserId: z.string().nullable().optional(),
});

/**
 * PATCH /api/projects/[id]/tasks/[taskId]
 * Updates status, notes, assignee, priority or details of a task / visual pin annotation.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;
    const body = await req.json();

    const parseResult = updateTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, title, content, notes, priority, dueDate, assigneeUserId } = parseResult.data;

    // Verify task exists and belongs to this project
    const existingTask = await prisma.comment.findFirst({
      where: { id: taskId, projectId },
      include: {
        project: {
          include: {
            assignments: {
              where: {
                revokedAt: null,
                expiresAt: { gt: new Date() },
              },
            },
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Role check: Developer must be actively assigned
    if (session.user.role === "DEVELOPER") {
      const isAssigned = existingTask.project.assignments.some(
        (a) => a.userId === session.user.id
      );
      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project" },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (notes !== undefined) updateData.notes = notes;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeUserId !== undefined) updateData.assigneeUserId = assigneeUserId;

    // Status transition tracking
    if (status !== undefined) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
        updateData.resolvedByUserId = session.user.id;
      } else {
        updateData.resolvedAt = null;
        updateData.resolvedByUserId = null;
      }
    }

    const updatedTask = await prisma.comment.update({
      where: { id: taskId },
      data: updateData,
      include: {
        page: {
          select: { id: true, path: true, title: true, fullUrl: true },
        },
        authorUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        assigneeUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        resolvedByUser: {
          select: { id: true, name: true },
        },
        replies: {
          include: {
            authorUser: {
              select: { id: true, name: true, role: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "TaskEngine/1.0";

    await recordAuditLog({
      userId: session.user.id,
      projectId,
      action: "TASK_UPDATED",
      ipAddress: ip,
      userAgent,
      metadata: {
        taskId,
        previousStatus: existingTask.status,
        newStatus: updatedTask.status,
        priority: updatedTask.priority,
        assigneeUserId: updatedTask.assigneeUserId,
      },
    });

    // Realtime notification dispatch
    const actorName = session.user.name || "Team Member";
    const taskSnippet = updatedTask.title || (updatedTask.content || "Task").slice(0, 50);

    // Status changed
    if (updatedTask.status !== existingTask.status) {
      if (updatedTask.status === "IN_PROGRESS") {
        await dispatchNotification({
          type: "TASK_STARTED",
          title: "Task In Progress",
          message: `${actorName} started working on "${taskSnippet}"`,
          link: `/developer/tasks?projectId=${projectId}`,
          projectId,
          excludeUserId: session.user.id,
          metadata: { taskId, status: "IN_PROGRESS" },
        });
      } else if (updatedTask.status === "RESOLVED") {
        await dispatchNotification({
          type: "TASK_RESOLVED",
          title: "Task Resolved",
          message: `${actorName} resolved: "${taskSnippet}"`,
          link: `/developer/tasks?projectId=${projectId}`,
          projectId,
          excludeUserId: session.user.id,
          metadata: { taskId, status: "RESOLVED" },
        });
      }
    }

    // Assignee changed
    if (
      updatedTask.assigneeUserId &&
      updatedTask.assigneeUserId !== existingTask.assigneeUserId
    ) {
      await dispatchNotification({
        type: "TASK_ASSIGNED",
        title: `Task Assigned: ${taskSnippet}`,
        message: `${actorName} assigned you to task "${taskSnippet}"`,
        link: `/developer/tasks?projectId=${projectId}`,
        projectId,
        userId: updatedTask.assigneeUserId,
        includeAdmins: true,
        excludeUserId: session.user.id,
        metadata: { taskId, assigneeUserId: updatedTask.assigneeUserId },
      });
    }

    // Priority raised to URGENT
    if (updatedTask.priority === "URGENT" && existingTask.priority !== "URGENT") {
      await dispatchNotification({
        type: "PRIORITY_URGENT",
        title: `URGENT Task: ${taskSnippet}`,
        message: `${actorName} elevated task "${taskSnippet}" to URGENT priority.`,
        link: `/developer/tasks?projectId=${projectId}`,
        projectId,
        excludeUserId: session.user.id,
        metadata: { taskId, priority: "URGENT" },
      });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("[PROJECT_TASK_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update task", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/tasks/[taskId]
 * Permanently deletes a task (Admin only).
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id: projectId, taskId } = await params;

    const existingTask = await prisma.comment.findFirst({
      where: { id: taskId, projectId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.comment.delete({
      where: { id: taskId },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "TaskEngine/1.0";

    await recordAuditLog({
      userId: session.user.id,
      projectId,
      action: "TASK_DELETED",
      ipAddress: ip,
      userAgent,
      metadata: {
        taskId,
        taskTitle: existingTask.title || existingTask.content.slice(0, 30),
      },
    });

    return NextResponse.json({ success: true, deletedId: taskId });
  } catch (error: any) {
    console.error("[PROJECT_TASK_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete task", details: error.message },
      { status: 500 }
    );
  }
}
