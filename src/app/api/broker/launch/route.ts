import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import {
  encryptSecret,
  decryptSecret,
  packVaultSecret,
  unpackVaultSecret,
  generateSecureToken,
  hashToken,
} from "@/lib/crypto";
import {
  authenticateWordPressSession,
  normalizeWpLoginUrl,
  WpCookie,
} from "@/lib/wp-session";
import { recordAuditLog } from "@/lib/audit";

interface LaunchRequestBody {
  projectId?: string;
  assignmentId?: string;
  wpUsername?: string;
  wpPassword?: string;
  mockSession?: boolean;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body: LaunchRequestBody = await req.json().catch(() => ({}));
    const { projectId, assignmentId, wpUsername, wpPassword, mockSession } = body;

    if (!projectId && !assignmentId) {
      return NextResponse.json(
        {
          error: "Either projectId or assignmentId is required.",
          code: "INVALID_PARAMETERS",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    let targetProject: any = null;
    let targetAssignment: any = null;

    // 1. Resolve Assignment & Project
    if (assignmentId) {
      targetAssignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          project: true,
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      if (!targetAssignment) {
        return NextResponse.json(
          { error: "Assignment not found.", code: "ASSIGNMENT_NOT_FOUND" },
          { status: 404 }
        );
      }

      // Check user permissions
      if (
        session.user.role !== "ADMIN" &&
        targetAssignment.userId !== session.user.id
      ) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      targetProject = targetAssignment.project;
    } else if (projectId) {
      targetProject = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          assignments: {
            where: {
              userId: session.user.id,
              revokedAt: null,
              expiresAt: { gt: now },
            },
          },
        },
      });

      if (!targetProject) {
        return NextResponse.json(
          { error: "Project not found.", code: "PROJECT_NOT_FOUND" },
          { status: 404 }
        );
      }

      if (session.user.role === "ADMIN") {
        // Admin gets direct access. Always anchor administrative login grant to the admin's own administrative assignment
        targetAssignment = await prisma.assignment.upsert({
          where: {
            projectId_userId: {
              projectId: targetProject.id,
              userId: session.user.id,
            },
          },
          update: {
            revokedAt: null,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
          create: {
            projectId: targetProject.id,
            userId: session.user.id,
            wpRoleTemplate: "RESTRICTED_ADMIN",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
      } else {
        // Developer must have active non-revoked assignment
        if (targetProject.assignments.length === 0) {
          return NextResponse.json(
            {
              error: "Access expired or revoked. You do not have an active assignment to this project.",
              code: "NO_ACTIVE_ASSIGNMENT",
            },
            { status: 403 }
          );
        }
        targetAssignment = targetProject.assignments[0];
      }
    }

    // 2. Validate Assignment Status
    if (targetAssignment.revokedAt !== null) {
      return NextResponse.json(
        {
          error: "Your access to this project has been revoked by the agency owner.",
          code: "ACCESS_REVOKED",
        },
        { status: 403 }
      );
    }

    if (now > new Date(targetAssignment.expiresAt)) {
      return NextResponse.json(
        {
          error: "Your access window to this project has expired.",
          code: "ACCESS_EXPIRED",
        },
        { status: 403 }
      );
    }

    // 3. Validate Project Status
    if (targetProject.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "This project is archived or inactive.",
          code: "PROJECT_INACTIVE",
        },
        { status: 403 }
      );
    }

    // 4. Resolve WordPress Credentials
    let effectiveUsername: string | null = null;
    let effectivePassword: string | null = null;

    if (session.user.role === "ADMIN" && wpUsername && wpPassword) {
      effectiveUsername = wpUsername.trim();
      effectivePassword = wpPassword.trim();
    } else if (
      targetProject.wpAdminUsernameEncrypted &&
      targetProject.wpAdminPasswordEncrypted &&
      targetProject.wpAdminUsernameIv &&
      targetProject.wpAdminUsernameAuthTag &&
      targetProject.wpAdminPasswordIv &&
      targetProject.wpAdminPasswordAuthTag
    ) {
      try {
        effectiveUsername = decryptSecret({
          ciphertext: targetProject.wpAdminUsernameEncrypted,
          iv: targetProject.wpAdminUsernameIv,
          authTag: targetProject.wpAdminUsernameAuthTag,
        });
        effectivePassword = decryptSecret({
          ciphertext: targetProject.wpAdminPasswordEncrypted,
          iv: targetProject.wpAdminPasswordIv,
          authTag: targetProject.wpAdminPasswordAuthTag,
        });
      } catch (decErr) {
        console.error("[WP_BROKER_DECRYPT_FAIL]", decErr);
        return NextResponse.json(
          {
            error: "Failed to decrypt WordPress credentials from vault.",
            code: "DECRYPTION_FAILED",
          },
          { status: 500 }
        );
      }
    }

    // Resolve custom login URL if stored inside wpSecretEncrypted
    let resolvedCustomLoginUrl: string | null = (targetProject as any).wpLoginUrl || null;
    if (!resolvedCustomLoginUrl && targetProject.wpSecretEncrypted && targetProject.wpSecretIv && targetProject.wpSecretAuthTag) {
      try {
        const dec = decryptSecret({
          ciphertext: targetProject.wpSecretEncrypted,
          iv: targetProject.wpSecretIv,
          authTag: targetProject.wpSecretAuthTag,
        });
        resolvedCustomLoginUrl = unpackVaultSecret(dec).wpLoginUrl;
      } catch {}
    }

    const { baseUrl, domain } = normalizeWpLoginUrl(targetProject.targetUrl, resolvedCustomLoginUrl);
    const directWpAdminUrl = `${baseUrl}/wp-admin/`;
    let cookies: WpCookie[] = [];

    // 5. Execute Headless Login or Mock Session (for staging/test)
    const isMock =
      mockSession === true ||
      process.env.MOCK_WP_SESSION === "true" ||
      domain === "example.com";

    if (effectiveUsername && effectivePassword && !isMock) {
      const loginResult = await authenticateWordPressSession({
        targetUrl: targetProject.targetUrl,
        username: effectiveUsername,
        password: effectivePassword,
        customLoginUrl: resolvedCustomLoginUrl,
      });

      if (!loginResult.success) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
        const userAgent = req.headers.get("user-agent") || "RenoBroker/1.0";

        await recordAuditLog({
          userId: session.user.id,
          projectId: targetProject.id,
          action: "WP_LOGIN_FAILED",
          ipAddress: ip,
          userAgent,
          metadata: {
            assignmentId: targetAssignment.id,
            targetUrl: targetProject.targetUrl,
            error: loginResult.error,
            statusCode: loginResult.statusCode,
          },
        });

        return NextResponse.json(
          {
            error: loginResult.error || "WordPress authentication failed against target site.",
            code: "WP_AUTH_FAILED",
            statusCode: loginResult.statusCode,
          },
          { status: 502 }
        );
      }

      cookies = loginResult.cookies;
    } else if (isMock) {
      // Realistic WordPress session cookies for offline demo & staging tests
      const cookieHash = hashToken(targetProject.id).substring(0, 16);
      const expiryEpoch = Math.floor(Date.now() / 1000) + 172800; // 48h
      const sanitizedUser = encodeURIComponent(session.user.name || "developer");

      cookies = [
        {
          name: `wordpress_logged_in_${cookieHash}`,
          value: `${sanitizedUser}%7C${expiryEpoch}%7Cmock_token_${hashToken(session.user.id).slice(0, 12)}`,
          domain,
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
        {
          name: `wordpress_sec_${cookieHash}`,
          value: `${sanitizedUser}%7C${expiryEpoch}%7Cmock_sec_${hashToken(session.user.id).slice(0, 12)}`,
          domain,
          path: "/wp-admin",
          httpOnly: true,
          secure: true,
          sameSite: "Lax",
        },
      ];
    } else {
      return NextResponse.json(
        {
          error: "WordPress master credentials have not been configured for this project in the Agency Vault.",
          code: "WP_CREDENTIALS_MISSING",
        },
        { status: 422 }
      );
    }

    // 6. Encrypt Session Cookie Payload (AES-256-GCM)
    const encryptedSession = encryptSecret(JSON.stringify(cookies));

    // 7. Dispatch Single-Use 60s Login Grant
    const rawGrantToken = generateSecureToken(32);
    const tokenHash = hashToken(rawGrantToken);
    const grantExpiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds TTL

    const loginGrant = await prisma.loginGrant.create({
      data: {
        tokenHash,
        assignmentId: targetAssignment.id,
        sessionDataEncrypted: encryptedSession.ciphertext,
        sessionDataIv: encryptedSession.iv,
        sessionDataAuthTag: encryptedSession.authTag,
        expiresAt: grantExpiresAt,
      },
    });

    // 8. Centralized Audit Log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "RenoBroker/1.0";

    await recordAuditLog({
      userId: session.user.id,
      projectId: targetProject.id,
      action: "WP_LOGIN_GRANT_DISPATCHED",
      ipAddress: ip,
      userAgent,
      metadata: {
        grantId: loginGrant.id,
        assignmentId: targetAssignment.id,
        targetUrl: targetProject.targetUrl,
        expiresAt: grantExpiresAt.toISOString(),
      },
    });

    // 9. Zero-Knowledge Response to Client
    // Plaintext passwords and session cookies are NEVER returned in this launch response.
    return NextResponse.json({
      success: true,
      grantToken: rawGrantToken,
      expiresAt: grantExpiresAt.toISOString(),
      targetUrl: targetProject.targetUrl,
      directWpAdminUrl,
    });
  } catch (error: any) {
    console.error("[BROKER_LAUNCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to initiate WordPress launch.", details: error.message },
      { status: 500 }
    );
  }
}
