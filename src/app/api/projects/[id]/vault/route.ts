import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Agency Admin access required.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        clientName: true,
        targetUrl: true,
        wpAdminUsernameEncrypted: true,
        wpAdminUsernameIv: true,
        wpAdminUsernameAuthTag: true,
        wpAdminPasswordEncrypted: true,
        updatedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found.", code: "NOT_FOUND" }, { status: 404 });
    }

    const isConfigured = Boolean(
      project.wpAdminUsernameEncrypted && project.wpAdminPasswordEncrypted
    );

    let maskedUsername = "";
    if (
      project.wpAdminUsernameEncrypted &&
      project.wpAdminUsernameIv &&
      project.wpAdminUsernameAuthTag
    ) {
      try {
        const rawUser = decryptSecret({
          ciphertext: project.wpAdminUsernameEncrypted,
          iv: project.wpAdminUsernameIv,
          authTag: project.wpAdminUsernameAuthTag,
        });

        if (rawUser.length <= 3) {
          maskedUsername = rawUser[0] + "***";
        } else {
          maskedUsername =
            rawUser.substring(0, 2) + "***" + rawUser.substring(rawUser.length - 1);
        }
      } catch {
        maskedUsername = "••••••••";
      }
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      targetUrl: project.targetUrl,
      isConfigured,
      maskedUsername,
      lastUpdated: project.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("[VAULT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve credential vault status.", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Agency Admin access required.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { wpAdminUsername, wpAdminPassword, targetUrl } = body;

    if (!wpAdminUsername || typeof wpAdminUsername !== "string" || !wpAdminUsername.trim()) {
      return NextResponse.json(
        { error: "WordPress admin username or email is required.", code: "USERNAME_REQUIRED" },
        { status: 400 }
      );
    }

    if (!wpAdminPassword || typeof wpAdminPassword !== "string" || !wpAdminPassword.trim()) {
      return NextResponse.json(
        { error: "WordPress master password is required.", code: "PASSWORD_REQUIRED" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found.", code: "NOT_FOUND" }, { status: 404 });
    }

    // Encrypt with AES-256-GCM
    const encUsername = encryptSecret(wpAdminUsername.trim());
    const encPassword = encryptSecret(wpAdminPassword.trim());

    const updateData: any = {
      wpAdminUsernameEncrypted: encUsername.ciphertext,
      wpAdminUsernameIv: encUsername.iv,
      wpAdminUsernameAuthTag: encUsername.authTag,
      wpAdminPasswordEncrypted: encPassword.ciphertext,
      wpAdminPasswordIv: encPassword.iv,
      wpAdminPasswordAuthTag: encPassword.authTag,
    };

    if (targetUrl && typeof targetUrl === "string" && /^https?:\/\//i.test(targetUrl.trim())) {
      updateData.targetUrl = targetUrl.trim().replace(/\/+$/, "");
    }

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    // Centralized Audit Log (NEVER logging plaintext credentials)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "VaultManager/1.0";

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "CREDENTIALS_VAULTED",
      ipAddress: ip,
      userAgent,
      metadata: {
        projectName: updated.name,
        targetUrl: updated.targetUrl,
        usernameLength: wpAdminUsername.trim().length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Master credentials for ${updated.name} have been encrypted with AES-256-GCM and stored in the secure vault.`,
      projectId: updated.id,
      targetUrl: updated.targetUrl,
      lastUpdated: updated.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error("[VAULT_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to vault WordPress credentials.", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Agency Admin access required.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const updated = await prisma.project.update({
      where: { id },
      data: {
        wpAdminUsernameEncrypted: null,
        wpAdminUsernameIv: null,
        wpAdminUsernameAuthTag: null,
        wpAdminPasswordEncrypted: null,
        wpAdminPasswordIv: null,
        wpAdminPasswordAuthTag: null,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "VaultManager/1.0";

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "CREDENTIALS_PURGED",
      ipAddress: ip,
      userAgent,
      metadata: {
        projectName: updated.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Vaulted credentials for ${updated.name} have been purged from the secure database.`,
    });
  } catch (error: any) {
    console.error("[VAULT_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to purge vaulted credentials.", details: error.message },
      { status: 500 }
    );
  }
}
