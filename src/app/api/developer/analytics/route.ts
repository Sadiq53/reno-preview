import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/developer/analytics
 * Provides deep developer productivity analytics, per-project workload breakdowns,
 * priority task queues (what to work on next), task age distribution, and completion rates.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    let accessibleProjectIds: string[] = [];
    let assignmentsList: any[] = [];

    if (session.user.role === "DEVELOPER") {
      assignmentsList = await prisma.assignment.findMany({
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
      accessibleProjectIds = assignmentsList.map((a) => a.projectId);
    } else {
      // ADMIN: Access all active projects
      const projects = await prisma.project.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, category: true, stage: true, targetUrl: true },
        orderBy: { name: "asc" },
      });
      accessibleProjectIds = projects.map((p) => p.id);
      assignmentsList = projects.map((p) => ({
        id: p.id,
        projectId: p.id,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        project: p,
      }));
    }

    if (accessibleProjectIds.length === 0) {
      return NextResponse.json({
        overview: {
          totalProjects: 0,
          totalTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          resolvedTasks: 0,
          completionRate: 100,
          urgentTasks: 0,
          highTasks: 0,
          mediumTasks: 0,
          lowTasks: 0,
          myResolvedCount: 0,
          myRepliesCount: 0,
        },
        ageDistribution: {
          freshCount: 0,   // < 24h
          activeCount: 0,  // 1-3 days
          agingCount: 0,   // 4-7 days
          staleCount: 0,   // > 7 days
        },
        projectBreakdowns: [],
        priorityQueue: [],
        recentlyResolved: [],
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        },
      });
    }

    // Fetch all comments in accessible projects
    const allComments = await prisma.comment.findMany({
      where: { projectId: { in: accessibleProjectIds } },
      include: {
        project: {
          select: { id: true, name: true, category: true, stage: true, targetUrl: true },
        },
        page: {
          select: { id: true, path: true, title: true },
        },
        authorUser: {
          select: { id: true, name: true, role: true },
        },
        resolvedByUser: {
          select: { id: true, name: true, role: true },
        },
        replies: {
          select: { id: true, authorUserId: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 1. Overall Stats
    const totalProjects = accessibleProjectIds.length;
    const totalTasks = allComments.length;
    const pendingTasks = allComments.filter((c) => c.status === "PENDING").length;
    const inProgressTasks = allComments.filter((c) => c.status === "IN_PROGRESS").length;
    const resolvedTasks = allComments.filter((c) => c.status === "RESOLVED").length;
    const completionRate = totalTasks > 0 ? Math.round((resolvedTasks / totalTasks) * 100) : 100;

    const urgentTasks = allComments.filter((c) => c.priority === "URGENT" && c.status !== "RESOLVED").length;
    const highTasks = allComments.filter((c) => c.priority === "HIGH" && c.status !== "RESOLVED").length;
    const mediumTasks = allComments.filter((c) => c.priority === "MEDIUM" && c.status !== "RESOLVED").length;
    const lowTasks = allComments.filter((c) => c.priority === "LOW" && c.status !== "RESOLVED").length;

    // My personal resolutions and replies
    const myResolvedCount = allComments.filter((c) => c.resolvedByUserId === session.user.id).length;
    const myRepliesCount = await prisma.commentReply.count({
      where: {
        authorUserId: session.user.id,
        comment: { projectId: { in: accessibleProjectIds } },
      },
    });

    // 2. Task Age & Staleness Distribution (for unresolved tasks)
    const unresolvedComments = allComments.filter((c) => c.status !== "RESOLVED");
    let freshCount = 0;   // < 24 hours
    let activeCount = 0;  // 1-3 days
    let agingCount = 0;   // 4-7 days
    let staleCount = 0;   // > 7 days

    const nowTime = now.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    unresolvedComments.forEach((c) => {
      const ageMs = Math.max(0, nowTime - new Date(c.createdAt).getTime());
      const ageDays = ageMs / oneDayMs;
      if (ageDays < 1) {
        freshCount++;
      } else if (ageDays <= 3) {
        activeCount++;
      } else if (ageDays <= 7) {
        agingCount++;
      } else {
        staleCount++;
      }
    });

    // 3. Per-Project Breakdown
    const projectBreakdowns = assignmentsList.map((item) => {
      const proj = item.project;
      const projComments = allComments.filter((c) => c.projectId === proj.id);
      const projTotal = projComments.length;
      const projResolved = projComments.filter((c) => c.status === "RESOLVED").length;
      const projInProgress = projComments.filter((c) => c.status === "IN_PROGRESS").length;
      const projPending = projComments.filter((c) => c.status === "PENDING").length;
      const projUrgent = projComments.filter((c) => c.priority === "URGENT" && c.status !== "RESOLVED").length;
      const projHigh = projComments.filter((c) => c.priority === "HIGH" && c.status !== "RESOLVED").length;
      const projProgressPercent = projTotal > 0 ? Math.round((projResolved / projTotal) * 100) : 100;

      const diffMs = Math.max(0, new Date(item.expiresAt).getTime() - nowTime);
      const daysRemaining = Math.max(0, Math.ceil(diffMs / oneDayMs));

      return {
        projectId: proj.id,
        projectName: proj.name,
        category: (proj as any).category,
        stage: (proj as any).stage,
        targetUrl: proj.targetUrl,
        daysRemaining,
        totalTasks: projTotal,
        pending: projPending,
        inProgress: projInProgress,
        resolved: projResolved,
        urgent: projUrgent,
        high: projHigh,
        progressPercent: projProgressPercent,
      };
    });

    // Sort projects: ones with urgent/pending tasks first
    projectBreakdowns.sort((a, b) => {
      if (b.urgent !== a.urgent) return b.urgent - a.urgent;
      if (b.pending !== a.pending) return b.pending - a.pending;
      return a.progressPercent - b.progressPercent;
    });

    // 4. Smart Priority Action Queue (What should the developer work on first?)
    // Priority Score: URGENT = 4, HIGH = 3, MEDIUM = 2, LOW = 1
    const priorityWeights: Record<string, number> = {
      URGENT: 4000,
      HIGH: 3000,
      MEDIUM: 2000,
      LOW: 1000,
    };

    const priorityQueue = unresolvedComments
      .map((c) => {
        const ageMs = Math.max(0, nowTime - new Date(c.createdAt).getTime());
        const ageHours = Math.round(ageMs / (1000 * 60 * 60));
        const ageDays = Math.floor(ageHours / 24);
        const weight = (priorityWeights[c.priority] || 1000) + Math.min(500, ageHours);

        return {
          id: c.id,
          content: c.content,
          title: c.title,
          priority: c.priority,
          status: c.status,
          notes: c.notes,
          createdAt: c.createdAt.toISOString(),
          ageHours,
          ageDays,
          projectId: c.projectId,
          projectName: c.project?.name || "Project",
          category: (c.project as any)?.category,
          pagePath: c.page?.path || "/",
          viewportWidth: c.viewportWidth,
          viewportHeight: c.viewportHeight,
          authorName: c.authorUser?.name || c.guestAuthorName || "Reviewer",
          repliesCount: c.replies.length,
          _weight: weight,
        };
      })
      .sort((a, b) => b._weight - a._weight)
      .slice(0, 15);

    // 5. Recently Resolved Items
    const recentlyResolved = allComments
      .filter((c) => c.status === "RESOLVED")
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        content: c.content,
        resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : c.updatedAt.toISOString(),
        projectName: c.project?.name || "Project",
        pagePath: c.page?.path || "/",
        resolverName: c.resolvedByUser?.name || "Resolved",
      }));

    return NextResponse.json({
      overview: {
        totalProjects,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        resolvedTasks,
        completionRate,
        urgentTasks,
        highTasks,
        mediumTasks,
        lowTasks,
        myResolvedCount,
        myRepliesCount,
      },
      ageDistribution: {
        freshCount,
        activeCount,
        agingCount,
        staleCount,
      },
      projectBreakdowns,
      priorityQueue,
      recentlyResolved,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    });
  } catch (error: any) {
    console.error("[GET_DEVELOPER_ANALYTICS_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to generate developer analytics", details: error.message },
      { status: 500 }
    );
  }
}
