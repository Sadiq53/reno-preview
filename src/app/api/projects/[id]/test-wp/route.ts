import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { encryptSecret, decryptSecret, packVaultSecret, unpackVaultSecret } from "@/lib/crypto";
import { authenticateWordPressSession } from "@/lib/wp-session";
import { recordAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    let { wpAdminUsername, wpAdminPassword, customLoginUrl, wpLoginUrl } = body;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let resolvedCustomLoginUrl = customLoginUrl || wpLoginUrl || null;
    let existingSecret: string | null = null;
    if (project.wpSecretEncrypted && project.wpSecretIv && project.wpSecretAuthTag) {
      try {
        const dec = decryptSecret({
          ciphertext: project.wpSecretEncrypted,
          iv: project.wpSecretIv,
          authTag: project.wpSecretAuthTag,
        });
        const unpacked = unpackVaultSecret(dec);
        if (!resolvedCustomLoginUrl) {
          resolvedCustomLoginUrl = unpacked.wpLoginUrl;
        }
        existingSecret = unpacked.secret;
      } catch {}
    }

    // If username or password not provided in payload, try decrypting from project vault
    if (!wpAdminUsername && project.wpAdminUsernameEncrypted && project.wpAdminUsernameIv && project.wpAdminUsernameAuthTag) {
      try {
        wpAdminUsername = decryptSecret({
          ciphertext: project.wpAdminUsernameEncrypted,
          iv: project.wpAdminUsernameIv,
          authTag: project.wpAdminUsernameAuthTag,
        });
      } catch {
        return NextResponse.json(
          { error: "Failed to decrypt stored WordPress username from vault." },
          { status: 500 }
        );
      }
    }

    if (!wpAdminPassword && project.wpAdminPasswordEncrypted && project.wpAdminPasswordIv && project.wpAdminPasswordAuthTag) {
      try {
        wpAdminPassword = decryptSecret({
          ciphertext: project.wpAdminPasswordEncrypted,
          iv: project.wpAdminPasswordIv,
          authTag: project.wpAdminPasswordAuthTag,
        });
      } catch {
        return NextResponse.json(
          { error: "Failed to decrypt stored WordPress password from vault." },
          { status: 500 }
        );
      }
    }

    if (!wpAdminUsername || !wpAdminPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "WordPress credentials missing. Please enter or vault both username and password.",
          code: "CREDENTIALS_MISSING",
        }
      );
    }

    if (!project.targetUrl) {
      return NextResponse.json(
        { error: "Project target URL is not configured", code: "TARGET_URL_MISSING" },
        { status: 400 }
      );
    }

    const result = await authenticateWordPressSession({
      targetUrl: project.targetUrl,
      username: wpAdminUsername.trim(),
      password: wpAdminPassword.trim(),
      customLoginUrl: resolvedCustomLoginUrl,
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "WP_CONNECTION_TESTED",
      metadata: {
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
        cookiesFound: result.cookies?.length || 0,
      },
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "WordPress login rejected. Please verify username and application password.",
        statusCode: result.statusCode || 400,
      });
    }

    let wasVaulted = false;
    if (wpAdminUsername && wpAdminPassword) {
      const encUser = encryptSecret(wpAdminUsername.trim());
      const encPass = encryptSecret(wpAdminPassword.trim());
      const updateData: any = {
        wpAdminUsernameEncrypted: encUser.ciphertext,
        wpAdminUsernameIv: encUser.iv,
        wpAdminUsernameAuthTag: encUser.authTag,
        wpAdminPasswordEncrypted: encPass.ciphertext,
        wpAdminPasswordIv: encPass.iv,
        wpAdminPasswordAuthTag: encPass.authTag,
      };
      if (resolvedCustomLoginUrl || existingSecret) {
        // Securely vault custom login URL inside encrypted wpSecret fields without schema collision
        const packed = packVaultSecret(existingSecret, resolvedCustomLoginUrl);
        const encSec = encryptSecret(packed);
        updateData.wpSecretEncrypted = encSec.ciphertext;
        updateData.wpSecretIv = encSec.iv;
        updateData.wpSecretAuthTag = encSec.authTag;
      }
      await prisma.project.update({
        where: { id },
        data: updateData,
      });
      wasVaulted = true;

      await recordAuditLog({
        userId: session.user.id,
        projectId: id,
        action: "PROJECT_CREDENTIALS_AUTO_VAULTED",
        metadata: {
          note: "Credentials verified via connection test and securely vaulted.",
          hasCustomLoginUrl: Boolean(resolvedCustomLoginUrl),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: wasVaulted
        ? "WordPress connection passed! Credentials verified and securely vaulted."
        : "WordPress connection test passed! Handshake established successfully.",
      cookiesCount: result.cookies?.length || 0,
      isVaulted: wasVaulted,
    });
  } catch (error: any) {
    console.error("[TEST_WP_ERROR]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reach WordPress login page." },
      { status: 500 }
    );
  }
}
