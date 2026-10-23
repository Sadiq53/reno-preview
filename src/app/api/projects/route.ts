import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateSharedSecret, encryptSecret } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only ADMIN can list all projects with full agency oversight
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
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
            shareLinks: true,
          },
        },
        comments: {
          select: {
            status: true,
          },
        },
        assignments: {
          select: {
            id: true,
            expiresAt: true,
            revokedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Compute status stats for each project
    const transformed = projects.map((p) => {
      const pendingCount = p.comments.filter((c) => c.status === "PENDING").length;
      const inProgressCount = p.comments.filter((c) => c.status === "IN_PROGRESS").length;
      const resolvedCount = p.comments.filter((c) => c.status === "RESOLVED").length;
      const totalComments = p.comments.length;
      const progressPercent = totalComments > 0 ? Math.round((resolvedCount / totalComments) * 100) : 100;

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
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        pageCount: p._count.pages,
        assignmentCount: p._count.assignments,
        shareLinkCount: p._count.shareLinks,
        taskStats: {
          total: totalComments,
          pending: pendingCount,
          inProgress: inProgressCount,
          resolved: resolvedCount,
          progressPercent,
        },
        assignments: p.assignments,
      };
    });

    return NextResponse.json({ projects: transformed });
  } catch (error: any) {
    console.error("[PROJECTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve projects", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      clientId,
      clientName: rawClientName,
      imageUrl,
      targetUrl,
      stage,
      category,
      startDate,
      targetDate,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    let resolvedClientId: string | null = clientId || null;
    let resolvedClientName: string = (rawClientName || "").trim();

    // If clientId is provided, retrieve client to ensure it exists and sync clientName
    if (resolvedClientId) {
      const client = await prisma.client.findUnique({ where: { id: resolvedClientId } });
      if (client) {
        resolvedClientName = client.name;
      }
    } else if (resolvedClientName) {
      // Find or create a client record to preserve relational integrity
      let client = await prisma.client.findFirst({ where: { name: resolvedClientName } });
      if (!client) {
        const slug = resolvedClientName.toLowerCase().replace(/[^a-z0-9]/g, "");
        client = await prisma.client.create({
          data: {
            name: resolvedClientName,
            email: `${slug || "client"}@client.com`,
            company: resolvedClientName,
          },
        });
      }
      resolvedClientId = client.id;
    } else {
      return NextResponse.json({ error: "Client selection or client name is required" }, { status: 400 });
    }

    // Target URL is now optional
    let cleanTargetUrl: string | null = null;
    if (targetUrl && typeof targetUrl === "string" && targetUrl.trim().length > 0) {
      if (!/^https?:\/\//i.test(targetUrl.trim())) {
        return NextResponse.json(
          { error: "Target URL must start with http:// or https://" },
          { status: 400 }
        );
      }
      cleanTargetUrl = targetUrl.trim().replace(/\/+$/, "");
    }

    // 1. Generate 256-bit random shared secret
    const rawSharedSecret = generateSharedSecret();

    // 2. Encrypt shared secret using AES-256-GCM
    const encryptedSecret = encryptSecret(rawSharedSecret);

    const rawPages: Array<{ path: string; title: string; isDefault?: boolean }> =
      Array.isArray(body.pages) && body.pages.length > 0
        ? body.pages
        : cleanTargetUrl
        ? [{ path: "/", title: "Home", isDefault: true }]
        : [];

    // Ensure "/" exists and normalize paths
    const pageMap = new Map<
      string,
      { path: string; title: string; fullUrl: string; isDefault: boolean; displayOrder: number }
    >();

    const defaultFullUrl = cleanTargetUrl || "/";
    const homeEntry = rawPages.find((p) => p.path === "/" || !p.path);
    pageMap.set("/", {
      path: "/",
      fullUrl: defaultFullUrl,
      title: homeEntry?.title?.trim() || "Home",
      isDefault: true,
      displayOrder: 1,
    });

    if (cleanTargetUrl) {
      let order = 2;
      for (const p of rawPages) {
        if (!p.path || p.path === "/") continue;
        const normalizedPath = p.path.trim().startsWith("/") ? p.path.trim() : `/${p.path.trim()}`;
        if (!pageMap.has(normalizedPath)) {
          pageMap.set(normalizedPath, {
            path: normalizedPath,
            fullUrl: `${cleanTargetUrl}${normalizedPath}`,
            title: p.title?.trim() || normalizedPath,
            isDefault: false,
            displayOrder: order++,
          });
        }
      }
    }

    const pagesToCreate = Array.from(pageMap.values());

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedTargetDate = targetDate ? new Date(targetDate) : null;

    // 3. Create Project & Pages in Database Transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: name.trim(),
          clientId: resolvedClientId,
          clientName: resolvedClientName,
          imageUrl: imageUrl ? String(imageUrl).trim() : null,
          stage: stage ? String(stage).trim() : "FULL_DEVELOPMENT",
          category: category ? String(category).trim() : "WORDPRESS",
          startDate: parsedStartDate && !isNaN(parsedStartDate.getTime()) ? parsedStartDate : null,
          targetDate: parsedTargetDate && !isNaN(parsedTargetDate.getTime()) ? parsedTargetDate : null,
          targetUrl: cleanTargetUrl,
          wpSecretEncrypted: encryptedSecret.ciphertext,
          wpSecretIv: encryptedSecret.iv,
          wpSecretAuthTag: encryptedSecret.authTag,
          status: "ACTIVE",
          pages: pagesToCreate.length > 0 ? { create: pagesToCreate } : undefined,
        },
        include: {
          pages: true,
          client: true,
        },
      });

      return newProject;
    });

    // 4. Record immutable audit log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Browser";

    await recordAuditLog({
      userId: session.user.id,
      projectId: project.id,
      action: "PROJECT_CREATED",
      ipAddress: ip,
      userAgent,
      metadata: {
        projectName: project.name,
        clientName: project.clientName,
        targetUrl: project.targetUrl,
      },
    });

    // 5. Return created project with one-time plain shared secret for the admin to copy
    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
          clientName: project.clientName,
          targetUrl: project.targetUrl,
          status: project.status,
          createdAt: project.createdAt,
          pages: project.pages,
        },
        oneTimeSharedSecret: rawSharedSecret,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[PROJECTS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create project", details: error.message },
      { status: 500 }
    );
  }
}
