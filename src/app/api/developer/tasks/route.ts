import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/developer/tasks
 * Fetches visual annotation tasks across all assigned projects for the logged-in developer,
 * with filters for project, status, priority, and search query.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    let accessibleProjectIds: string[] = [];
    let assignedProjects: { id: string; name: string; category?: string; stage?: string; targetUrl?: string | null }[] = [];

    if (session.user.role === "DEVELOPER") {
      const assignments = await prisma.assignment.findMany({
        where: {
          userId: session.user.id,
          revokedAt: null,
          expiresAt: { gt: now },
          project: { status: "ACTIVE" },
        },
        include: {
          project: {
            select: { id: true, name: true, category: true, stage: true, targetUrl: true },
          },
        },
        orderBy: { project: { name: "asc" } },
      });
      accessibleProjectIds = assignments.map((a) => a.projectId);
      assignedProjects = assignments.map((a) => a.project);
    } else {
      // ADMIN: Access all active projects
      const projects = await prisma.project.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, category: true, stage: true, targetUrl: true },
        orderBy: { name: "asc" },
      });
      accessibleProjectIds = projects.map((p) => p.id);
      assignedProjects = projects;
    }

    if (accessibleProjectIds.length === 0) {
      return NextResponse.json({
        tasks: [],
        projects: [],
        stats: { total: 0, pending: 0, inProgress: 0, resolved: 0, progressPercent: 100 },
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const requestedProjectId = searchParams.get("projectId");
    const statusFilter = searchParams.get("status");
    const priorityFilter = searchParams.get("priority");
    const searchQuery = searchParams.get("search")?.trim();

    let targetProjectIds = accessibleProjectIds;
    if (requestedProjectId && requestedProjectId !== "all") {
      if (!accessibleProjectIds.includes(requestedProjectId)) {
        return NextResponse.json(
          { error: "Access denied to the requested project" },
          { status: 403 }
        );
      }
      targetProjectIds = [requestedProjectId];
    }

    // Build query where clause
    const whereClause: any = {
      projectId: { in: targetProjectIds },
    };

    if (statusFilter && ["PENDING", "IN_PROGRESS", "RESOLVED"].includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    if (priorityFilter && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priorityFilter)) {
      whereClause.priority = priorityFilter;
    }

    if (searchQuery) {
      whereClause.OR = [
        { content: { contains: searchQuery, mode: "insensitive" } },
        { notes: { contains: searchQuery, mode: "insensitive" } },
        { title: { contains: searchQuery, mode: "insensitive" } },
        { guestAuthorName: { contains: searchQuery, mode: "insensitive" } },
        { page: { path: { contains: searchQuery, mode: "insensitive" } } },
      ];
    }

    // Fetch tasks
    const tasks = await prisma.comment.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, name: true, category: true, stage: true, targetUrl: true },
        },
        page: {
          select: { id: true, path: true, title: true, fullUrl: true },
        },
        authorUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        resolvedByUser: {
          select: { id: true, name: true, role: true },
        },
        assigneeUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
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
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    // Compute stats
    const allProjectTasks = await prisma.comment.findMany({
      where: { projectId: { in: targetProjectIds } },
      select: { status: true },
    });

    const total = allProjectTasks.length;
    const pending = allProjectTasks.filter((t) => t.status === "PENDING").length;
    const inProgress = allProjectTasks.filter((t) => t.status === "IN_PROGRESS").length;
    const resolved = allProjectTasks.filter((t) => t.status === "RESOLVED").length;
    const progressPercent = total > 0 ? Math.round((resolved / total) * 100) : 100;

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
      tasks: sanitizedTasks,
      projects: assignedProjects,
      stats: {
        total,
        pending,
        inProgress,
        resolved,
        progressPercent,
      },
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    });
  } catch (error: any) {
    console.error("[GET_DEVELOPER_TASKS_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to fetch developer tasks", details: error.message },
      { status: 500 }
    );
  }
}
