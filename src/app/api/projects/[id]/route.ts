import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { encryptSecret, decryptSecret, packVaultSecret, unpackVaultSecret } from "@/lib/crypto";
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
      include: {
        client: true,
        pages: {
          orderBy: { displayOrder: "asc" },
        },
        assignments: {
          where: {
            user: { role: "DEVELOPER" },
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
        comments: {
          include: {
            authorUser: {
              select: { id: true, name: true, role: true, avatarUrl: true },
            },
            resolvedByUser: {
              select: { id: true, name: true },
            },
            assigneeUser: {
              select: { id: true, name: true, avatarUrl: true },
            },
            page: {
              select: { id: true, path: true, title: true },
            },
            replies: {
              include: {
                authorUser: { select: { id: true, name: true, role: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        shareLinks: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Ensure at least one default page exists so visual annotator and comments always have an anchor
    if (project.pages.length === 0) {
      try {
        const rootPage = await prisma.projectPage.create({
          data: {
            projectId: project.id,
            path: "/",
            fullUrl: project.targetUrl || "/",
            title: "Home",
            isDefault: true,
            displayOrder: 1,
          },
        });
        project.pages = [rootPage];
      } catch (e) {
        console.warn("[PROJECT_AUTO_PAGE_INIT_WARN]", e);
      }
    }

    // Role check: If DEVELOPER, ensure they are assigned to this project
    if (session.user.role === "DEVELOPER") {
      const isAssigned = project.assignments.some(
        (a) => a.userId === session.user.id && !a.revokedAt && new Date(a.expiresAt) > new Date()
      );
      if (!isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project" },
          { status: 403 }
        );
      }
    }

    // Unpack custom login URL if stored inside wpSecretEncrypted
    let resolvedWpLoginUrl: string | null = (project as any).wpLoginUrl || null;
    if (!resolvedWpLoginUrl && project.wpSecretEncrypted && project.wpSecretIv && project.wpSecretAuthTag) {
      try {
        const dec = decryptSecret({
          ciphertext: project.wpSecretEncrypted,
          iv: project.wpSecretIv,
          authTag: project.wpSecretAuthTag,
        });
        resolvedWpLoginUrl = unpackVaultSecret(dec).wpLoginUrl;
      } catch {}
    }

    const isDev = session.user.role === "DEVELOPER";
    const safeProject = {
      id: project.id,
      name: project.name,
      clientName: isDev ? undefined : project.clientName,
      clientId: isDev ? undefined : (project as any).clientId,
      client: isDev ? undefined : (project as any).client,
      category: (project as any).category,
      stage: (project as any).stage,
      imageUrl: (project as any).imageUrl,
      startDate: (project as any).startDate,
      targetDate: (project as any).targetDate,
      targetUrl: project.targetUrl,
      status: project.status,
      defaultViewport: project.defaultViewport,
      allowGuestComments: project.allowGuestComments,
      requireGuestEmail: project.requireGuestEmail,
      shareExpirationDays: project.shareExpirationDays,
      autoUnframeProxy: project.autoUnframeProxy,
      allowExtensionLogin: (project as any).allowExtensionLogin ?? true,
      allowProxyLogin: (project as any).allowProxyLogin ?? false,
      wpLoginUrl: resolvedWpLoginUrl,
      isWpConfigured: Boolean(project.wpAdminUsernameEncrypted && project.wpAdminPasswordEncrypted),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      pages: project.pages,
      assignments: project.assignments,
      comments: project.comments,
      shareLinks: project.shareLinks,
    };

    return NextResponse.json({ project: safeProject });
  } catch (error: any) {
    console.error("[PROJECT_GET_BY_ID_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve project", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      name,
      clientName,
      targetUrl,
      status,
      defaultViewport,
      allowGuestComments,
      requireGuestEmail,
      shareExpirationDays,
      autoUnframeProxy,
      allowExtensionLogin,
      allowProxyLogin,
      wpLoginUrl,
      wpAdminUsername,
      wpAdminPassword,
      wpSecret,
      clientId,
      category,
      stage,
      imageUrl,
      startDate,
      targetDate,
    } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (clientName) dataToUpdate.clientName = clientName.trim();
    if (clientId !== undefined) {
      dataToUpdate.clientId = clientId || null;
      if (clientId) {
        const c = await prisma.client.findUnique({ where: { id: clientId } });
        if (c) dataToUpdate.clientName = c.name;
      }
    }
    if (category) dataToUpdate.category = category;
    if (stage) dataToUpdate.stage = stage;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl ? imageUrl.trim() : null;
    if (startDate !== undefined) {
      dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    }
    if (targetDate !== undefined) {
      dataToUpdate.targetDate = targetDate ? new Date(targetDate) : null;
    }
    if (targetUrl) {
      const cleanUrl = targetUrl.trim().replace(/\/+$/, "");
      dataToUpdate.targetUrl = cleanUrl;
      try {
        const rootPage = await prisma.projectPage.findFirst({
          where: { projectId: id, path: "/" },
        });
        if (rootPage) {
          await prisma.projectPage.update({
            where: { id: rootPage.id },
            data: { fullUrl: cleanUrl },
          });
        } else {
          await prisma.projectPage.create({
            data: {
              projectId: id,
              path: "/",
              fullUrl: cleanUrl,
              title: "Home",
              isDefault: true,
              displayOrder: 1,
            },
          });
        }
      } catch {}
    }
    if (status && (status === "ACTIVE" || status === "ARCHIVED")) {
      dataToUpdate.status = status;
    }
    if (defaultViewport && ["desktop", "tablet", "mobile"].includes(defaultViewport)) {
      dataToUpdate.defaultViewport = defaultViewport;
    }
    if (typeof allowGuestComments === "boolean") {
      dataToUpdate.allowGuestComments = allowGuestComments;
    }
    if (typeof requireGuestEmail === "boolean") {
      dataToUpdate.requireGuestEmail = requireGuestEmail;
    }
    if (typeof shareExpirationDays === "number") {
      dataToUpdate.shareExpirationDays = shareExpirationDays;
    }
    if (typeof autoUnframeProxy === "boolean") {
      dataToUpdate.autoUnframeProxy = autoUnframeProxy;
    }
    if (typeof allowExtensionLogin === "boolean") {
      dataToUpdate.allowExtensionLogin = allowExtensionLogin;
    }
    if (typeof allowProxyLogin === "boolean") {
      dataToUpdate.allowProxyLogin = allowProxyLogin;
    }

    // Securely encrypt and vault WordPress credentials if provided
    if (wpAdminUsername && typeof wpAdminUsername === "string" && wpAdminUsername.trim()) {
      const encUser = encryptSecret(wpAdminUsername.trim());
      dataToUpdate.wpAdminUsernameEncrypted = encUser.ciphertext;
      dataToUpdate.wpAdminUsernameIv = encUser.iv;
      dataToUpdate.wpAdminUsernameAuthTag = encUser.authTag;
    }

    if (wpAdminPassword && typeof wpAdminPassword === "string" && wpAdminPassword.trim()) {
      const encPass = encryptSecret(wpAdminPassword.trim());
      dataToUpdate.wpAdminPasswordEncrypted = encPass.ciphertext;
      dataToUpdate.wpAdminPasswordIv = encPass.iv;
      dataToUpdate.wpAdminPasswordAuthTag = encPass.authTag;
    }

    // Securely vault custom login URL and/or WP secret packed into existing wpSecret fields
    if (wpSecret !== undefined || wpLoginUrl !== undefined) {
      const existingProject = await prisma.project.findUnique({
        where: { id },
        select: {
          wpSecretEncrypted: true,
          wpSecretIv: true,
          wpSecretAuthTag: true,
        },
      });

      let existingSecret: string | null = null;
      let existingLoginUrl: string | null = null;

      if (
        existingProject?.wpSecretEncrypted &&
        existingProject.wpSecretIv &&
        existingProject.wpSecretAuthTag
      ) {
        try {
          const dec = decryptSecret({
            ciphertext: existingProject.wpSecretEncrypted,
            iv: existingProject.wpSecretIv,
            authTag: existingProject.wpSecretAuthTag,
          });
          const unpacked = unpackVaultSecret(dec);
          existingSecret = unpacked.secret;
          existingLoginUrl = unpacked.wpLoginUrl;
        } catch {}
      }

      const finalSecret = wpSecret !== undefined
        ? (wpSecret && typeof wpSecret === "string" ? wpSecret.trim() : null)
        : existingSecret;
      const finalLoginUrl = wpLoginUrl !== undefined
        ? (wpLoginUrl && typeof wpLoginUrl === "string" ? wpLoginUrl.trim() : null)
        : existingLoginUrl;

      if (finalSecret || finalLoginUrl) {
        const packed = packVaultSecret(finalSecret, finalLoginUrl);
        const encSec = encryptSecret(packed);
        dataToUpdate.wpSecretEncrypted = encSec.ciphertext;
        dataToUpdate.wpSecretIv = encSec.iv;
        dataToUpdate.wpSecretAuthTag = encSec.authTag;
      } else {
        dataToUpdate.wpSecretEncrypted = null;
        dataToUpdate.wpSecretIv = null;
        dataToUpdate.wpSecretAuthTag = null;
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: dataToUpdate,
    });

    const safeAuditMetadata = { ...dataToUpdate };
    delete safeAuditMetadata.wpAdminUsernameEncrypted;
    delete safeAuditMetadata.wpAdminUsernameIv;
    delete safeAuditMetadata.wpAdminUsernameAuthTag;
    delete safeAuditMetadata.wpAdminPasswordEncrypted;
    delete safeAuditMetadata.wpAdminPasswordIv;
    delete safeAuditMetadata.wpAdminPasswordAuthTag;
    delete safeAuditMetadata.wpSecretEncrypted;
    delete safeAuditMetadata.wpSecretIv;
    delete safeAuditMetadata.wpSecretAuthTag;

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "PROJECT_UPDATED",
      metadata: {
        ...safeAuditMetadata,
        credentialsUpdated: Boolean(wpAdminUsername || wpAdminPassword || wpSecret),
      },
    });

    return NextResponse.json({
      project: {
        id: updated.id,
        name: updated.name,
        clientName: updated.clientName,
        targetUrl: updated.targetUrl,
        status: updated.status,
        defaultViewport: updated.defaultViewport,
        allowGuestComments: updated.allowGuestComments,
        requireGuestEmail: updated.requireGuestEmail,
        shareExpirationDays: updated.shareExpirationDays,
        autoUnframeProxy: updated.autoUnframeProxy,
        isWpConfigured: Boolean(updated.wpAdminUsernameEncrypted && updated.wpAdminPasswordEncrypted),
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[PROJECT_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update project", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.project.delete({
      where: { id },
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "PROJECT_DELETED",
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[PROJECT_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete project", details: error.message },
      { status: 500 }
    );
  }
}
