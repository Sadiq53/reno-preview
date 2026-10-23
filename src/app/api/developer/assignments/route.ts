import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const assignments = await prisma.assignment.findMany({
      where: {
        userId: session.user.id,
        revokedAt: null,
        expiresAt: { gt: now },
        project: { status: "ACTIVE" },
      },
      include: {
        project: {
          include: {
            pages: {
              where: { isHidden: false },
              orderBy: { displayOrder: "asc" },
              select: {
                id: true,
                title: true,
                path: true,
                isDefault: true,
              },
            },
            comments: {
              select: { status: true },
            },
          },
        },
      },
      orderBy: { expiresAt: "asc" },
    });

    const transformed = assignments.map((a) => {
      const totalComments = a.project.comments.length;
      const resolvedComments = a.project.comments.filter((c) => c.status === "RESOLVED").length;
      const inProgressComments = a.project.comments.filter((c) => c.status === "IN_PROGRESS").length;
      const pendingComments = a.project.comments.filter((c) => c.status === "PENDING").length;

      const diffMs = Math.max(0, new Date(a.expiresAt).getTime() - now.getTime());
      const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        assignmentId: a.id,
        wpRoleTemplate: a.wpRoleTemplate,
        expiresAt: a.expiresAt.toISOString(),
        hoursRemaining,
        daysRemaining,
        project: {
          id: a.project.id,
          name: a.project.name,
          category: a.project.category,
          stage: a.project.stage,
          imageUrl: a.project.imageUrl,
          targetUrl: a.project.targetUrl,
          allowExtensionLogin: (a.project as any).allowExtensionLogin ?? true,
          allowProxyLogin: (a.project as any).allowProxyLogin ?? false,
          isWpConfigured: Boolean(a.project.wpAdminUsernameEncrypted && a.project.wpAdminPasswordEncrypted),
          pages: a.project.pages,
          taskStats: {
            total: totalComments,
            resolved: resolvedComments,
            inProgress: inProgressComments,
            pending: pendingComments,
            progressPercent:
              totalComments > 0
                ? Math.round((resolvedComments / totalComments) * 100)
                : 100,
          },
        },
      };
    });

    return NextResponse.json({
      assignments: transformed,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
    });
  } catch (error: any) {
    console.error("[GET_DEVELOPER_ASSIGNMENTS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error fetching developer assignments", details: error.message },
      { status: 500 }
    );
  }
}
