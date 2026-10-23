import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const now = new Date();

    // 1. Fetch Projects with counts and comments
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        clientName: true,
        imageUrl: true,
        stage: true,
        category: true,
        startDate: true,
        targetDate: true,
        targetUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            pages: true,
            assignments: true,
            comments: true,
          },
        },
        comments: {
          select: { status: true },
        },
        assignments: {
          where: {
            revokedAt: null,
            expiresAt: { gt: now },
          },
          select: {
            id: true,
            wpRoleTemplate: true,
            expiresAt: true,
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    const transformedProjects = projects.map((p) => {
      const totalComments = p.comments.length;
      const resolvedComments = p.comments.filter((c) => c.status === "RESOLVED").length;
      const pendingComments = p.comments.filter((c) => c.status === "PENDING").length;
      const inProgressComments = p.comments.filter((c) => c.status === "IN_PROGRESS").length;
      const progressPercent = totalComments > 0 ? Math.round((resolvedComments / totalComments) * 100) : 100;

      return {
        id: p.id,
        name: p.name,
        clientId: (p as any).clientId,
        client: (p as any).client,
        clientName: p.clientName,
        imageUrl: (p as any).imageUrl,
        stage: (p as any).stage || "FULL_DEVELOPMENT",
        category: (p as any).category || "WORDPRESS",
        startDate: (p as any).startDate,
        targetDate: (p as any).targetDate,
        targetUrl: p.targetUrl,
        status: p.status,
        pageCount: p._count.pages,
        assignmentCount: p.assignments.length,
        taskStats: {
          total: totalComments,
          resolved: resolvedComments,
          pending: pendingComments,
          inProgress: inProgressComments,
          progressPercent,
        },
        activeAssignees: p.assignments.map((a) => a.user),
      };
    });

    // 2. Global Metric Counts
    const [totalProjectsCount, totalPagesCount, totalCommentsCount, resolvedCommentsCount, totalDevsCount, activeAssignmentsCount] =
      await Promise.all([
        prisma.project.count(),
        prisma.projectPage.count(),
        prisma.comment.count(),
        prisma.comment.count({ where: { status: "RESOLVED" } }),
        prisma.user.count({ where: { role: "DEVELOPER" } }),
        prisma.assignment.count({
          where: {
            revokedAt: null,
            expiresAt: { gt: now },
          },
        }),
      ]);

    // 3. Recent Audit Logs (Security stream)
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, email: true, role: true } },
        project: { select: { name: true } },
      },
    });

    // 4. Developers Summary
    const developers = await prisma.user.findMany({
      where: { role: "DEVELOPER" },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        _count: {
          select: { assignments: true },
        },
      },
    });

    const overallProgressPercent =
      totalCommentsCount > 0
        ? Math.round((resolvedCommentsCount / totalCommentsCount) * 100)
        : 100;

    return NextResponse.json({
      metrics: {
        totalProjects: totalProjectsCount,
        totalPages: totalPagesCount,
        totalTasks: totalCommentsCount,
        resolvedTasks: resolvedCommentsCount,
        pendingTasks: totalCommentsCount - resolvedCommentsCount,
        overallProgressPercent,
        totalDevelopers: totalDevsCount,
        activeAssignments: activeAssignmentsCount,
      },
      recentProjects: transformedProjects,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        timestamp: l.timestamp.toISOString(),
        userName: l.user?.name || "System",
        userRole: l.user?.role || "SYSTEM",
        projectName: l.project?.name || null,
        metadata: l.metadata,
      })),
      developers: developers.map((d) => ({
        id: d.id,
        name: d.name,
        email: d.email,
        avatarUrl: d.avatarUrl,
        assignmentCount: d._count.assignments,
      })),
    });
  } catch (error: any) {
    console.error("[GET_ADMIN_DASHBOARD_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error loading admin dashboard", details: error.message },
      { status: 500 }
    );
  }
}
