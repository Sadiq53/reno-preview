import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        targetUrl: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const pages = await prisma.projectPage.findMany({
      where: { projectId: id },
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    const transformed = pages.map((page) => ({
      id: page.id,
      path: page.path,
      fullUrl: page.fullUrl,
      title: page.title,
      isDefault: page.isDefault,
      isHidden: page.isHidden,
      displayOrder: page.displayOrder,
      commentCount: page._count.comments,
      createdAt: page.createdAt,
    }));

    return NextResponse.json({
      project,
      pages: transformed,
    });
  } catch (error: any) {
    console.error("[PAGES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve project pages", details: error.message },
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

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Determine highest displayOrder
    const highest = await prisma.projectPage.findFirst({
      where: { projectId: id },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    let nextOrder = (highest?.displayOrder || 0) + 1;

    // Handle BATCH page addition (e.g. from website discovery sync)
    if (Array.isArray(body.pages)) {
      const existingPages = await prisma.projectPage.findMany({
        where: { projectId: id },
        select: { path: true },
      });
      const existingSet = new Set(existingPages.map((p) => p.path));

      const toCreate: Array<{
        projectId: string;
        path: string;
        fullUrl: string;
        title: string;
        isDefault: boolean;
        isHidden: boolean;
        displayOrder: number;
      }> = [];

      for (const item of body.pages) {
        if (!item.path || typeof item.path !== "string") continue;
        const normalizedPath = item.path.trim().startsWith("/") ? item.path.trim() : `/${item.path.trim()}`;
        if (existingSet.has(normalizedPath)) continue;
        existingSet.add(normalizedPath);

        const cleanTitle = item.title && typeof item.title === "string" ? item.title.trim() : normalizedPath;
        const baseUrl = project.targetUrl ? project.targetUrl.replace(/\/+$/, "") : "";
        const fullUrl = baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;

        toCreate.push({
          projectId: id,
          path: normalizedPath,
          fullUrl,
          title: cleanTitle,
          isDefault: false,
          isHidden: false,
          displayOrder: nextOrder++,
        });
      }

      if (toCreate.length > 0) {
        await prisma.projectPage.createMany({
          data: toCreate,
        });

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
        const userAgent = req.headers.get("user-agent") || "Browser";

        await recordAuditLog({
          userId: session.user.id,
          projectId: id,
          action: "PAGE_CREATED",
          ipAddress: ip,
          userAgent,
          metadata: {
            batchCount: toCreate.length,
            paths: toCreate.map((p) => p.path),
          },
        });
      }

      // Return refreshed list of all project pages
      const allPages = await prisma.projectPage.findMany({
        where: { projectId: id },
        orderBy: { displayOrder: "asc" },
      });

      return NextResponse.json({
        ok: true,
        createdCount: toCreate.length,
        pages: allPages,
      }, { status: 201 });
    }

    // Handle SINGLE page addition
    const { path, title } = body;

    if (!path || typeof path !== "string" || path.trim().length === 0) {
      return NextResponse.json({ error: "Page path is required (e.g. /about)" }, { status: 400 });
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Page title is required" }, { status: 400 });
    }

    // Ensure path begins with a forward slash
    const normalizedPath = path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;

    // Check for duplicate path
    const existing = await prisma.projectPage.findUnique({
      where: {
        projectId_path: {
          projectId: id,
          path: normalizedPath,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Page path "${normalizedPath}" already exists for this project` },
        { status: 409 }
      );
    }

    const baseUrl = project.targetUrl ? project.targetUrl.replace(/\/+$/, "") : "";
    const fullUrl = baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;

    const newPage = await prisma.projectPage.create({
      data: {
        projectId: id,
        path: normalizedPath,
        fullUrl,
        title: title.trim(),
        isDefault: false,
        isHidden: false,
        displayOrder: nextOrder,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Browser";

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "PAGE_ADDED",
      metadata: { path: normalizedPath, title: title.trim() },
    });

    return NextResponse.json({ page: newPage }, { status: 201 });
  } catch (error: any) {
    console.error("[PAGES_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to add project page", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { updates } = body; // Array of { id: string, displayOrder?: number, isHidden?: boolean }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates format: expected array" }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map((item) =>
        prisma.projectPage.update({
          where: { id: item.id },
          data: {
            ...(typeof item.displayOrder === "number" && { displayOrder: item.displayOrder }),
            ...(typeof item.isHidden === "boolean" && { isHidden: item.isHidden }),
          },
        })
      )
    );

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "PAGES_REORDERED",
      metadata: { count: updates.length },
    });

    return NextResponse.json({ success: true, updatedCount: updates.length });
  } catch (error: any) {
    console.error("[PAGES_PUT_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update page orders", details: error.message },
      { status: 500 }
    );
  }
}
