import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  content: z.string().trim().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().nullable().optional(),
  assigneeUserId: z.string().nullable().optional(),
  pageId: z.string().nullable().optional(),
  notes: z.string().trim().optional(),
});

/**
 * GET /api/projects/[id]/tasks
 * Retrieves all unified tasks for the project (both manual tasks and canvas visual pins),
 * along with project metadata and assignable developers.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        clientName: true,
        targetUrl: true,
        status: true,
        assignments: {
          where: {
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
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
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Role verification: If DEVELOPER, ensure active assignment
    if (session.user.role === "DEVELOPER") {
      const isAssigned = project.assignments.some((a) => a.user.id === session.user.id);
      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project" },
          { status: 403 }
        );
      }
    }

    // Fetch unified tasks (all Comments: visual annotations + manual tasks)
    const tasks = await prisma.comment.findMany({
      where: { projectId },
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
      orderBy: { createdAt: "desc" },
    });

    // Also get project pages for task linking
    const pages = await prisma.projectPage.findMany({
      where: { projectId },
      select: { id: true, path: true, title: true },
      orderBy: { displayOrder: "asc" },
    });

    const isDeveloper = session.user.role === "DEVELOPER";
    const sanitizedTasks = isDeveloper
      ? tasks.map((t) => ({
          ...t,
          guestAuthorName: !t.authorUserId || t.guestAuthorName ? "Client" : t.guestAuthorName,
          guestAuthorEmail: null,
          replies: t.replies.map((r) => ({
            ...r,
            guestAuthorName: !r.authorUserId || r.guestAuthorName ? "Client" : r.guestAuthorName,
          })),
        }))
      : tasks;

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        clientName: isDeveloper ? undefined : project.clientName,
        targetUrl: project.targetUrl,
        status: project.status,
      },
      tasks: sanitizedTasks,
      assignableUsers: project.assignments.map((a) => a.user),
      pages,
    });
  } catch (error: any) {
    console.error("[PROJECT_TASKS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch project tasks", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/tasks
 * Manually creates a new task on the project Kanban board.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await req.json();

    const parseResult = createTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, content, priority, dueDate, assigneeUserId, pageId, notes } = parseResult.data;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        assignments: {
          where: {
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Role check: Developer must be actively assigned
    if (session.user.role === "DEVELOPER") {
      const isAssigned = project.assignments.some((a) => a.userId === session.user.id);
      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project" },
          { status: 403 }
        );
      }
    }

    const task = await prisma.comment.create({
      data: {
        projectId,
        pageId: pageId || null,
        authorUserId: session.user.id,
        title,
        content: content || title,
        notes: notes || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeUserId: assigneeUserId || null,
        status: "PENDING",
        posX: null,
        posY: null,
        viewportWidth: null,
        viewportHeight: null,
        scrollY: 0,
      },
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
        replies: true,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "TaskEngine/1.0";

    await recordAuditLog({
      userId: session.user.id,
      projectId,
      action: "TASK_CREATED",
      ipAddress: ip,
      userAgent,
      metadata: {
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        assigneeUserId: task.assigneeUserId,
      },
    });

    // Realtime notification dispatch
    const authorName = session.user.name || "Team Member";
    if (task.assigneeUserId) {
      await dispatchNotification({
        type: "TASK_ASSIGNED",
        title: `Task Assigned: ${task.title || "New Task"}`,
        message: `${authorName} assigned you a task: "${(task.title || task.content).slice(0, 50)}"`,
        link: `/developer/tasks?projectId=${projectId}`,
        projectId,
        userId: task.assigneeUserId,
        includeAdmins: true,
        excludeUserId: session.user.id,
        metadata: { taskId: task.id, priority: task.priority },
      });
    } else {
      await dispatchNotification({
        type: "TASK_ASSIGNED",
        title: `New Task: ${task.title || "Unassigned Task"}`,
        message: `${authorName} created a new task: "${(task.title || task.content).slice(0, 50)}"`,
        link: `/developer/tasks?projectId=${projectId}`,
        projectId,
        excludeUserId: session.user.id,
        metadata: { taskId: task.id, priority: task.priority },
      });
    }

    if (task.priority === "URGENT") {
      await dispatchNotification({
        type: "PRIORITY_URGENT",
        title: `URGENT Task: ${task.title}`,
        message: `${authorName} marked task "${task.title}" as URGENT priority.`,
        link: `/developer/tasks?projectId=${projectId}`,
        projectId,
        excludeUserId: session.user.id,
        metadata: { taskId: task.id, priority: "URGENT" },
      });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    console.error("[PROJECT_TASKS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create task", details: error.message },
      { status: 500 }
    );
  }
}
