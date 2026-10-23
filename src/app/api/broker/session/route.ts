import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hashToken, decryptSecret } from "@/lib/crypto";
import { normalizeWpLoginUrl, WpCookie } from "@/lib/wp-session";
import { recordAuditLog } from "@/lib/audit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-grant-token",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  try {
    // 1. Extract Grant Token from Body or Headers
    let grantToken: string | null = null;

    // Check custom header
    const xGrantToken = req.headers.get("x-grant-token");
    if (xGrantToken) {
      grantToken = xGrantToken.trim();
    }

    // Check Bearer authorization header
    if (!grantToken) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        grantToken = authHeader.substring(7).trim();
      }
    }

    // Check JSON body
    if (!grantToken) {
      const body = await req.json().catch(() => ({}));
      if (body?.grantToken && typeof body.grantToken === "string") {
        grantToken = body.grantToken.trim();
      }
    }

    if (!grantToken) {
      return NextResponse.json(
        { error: "Grant token is required.", code: "TOKEN_REQUIRED" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Lookup Grant by SHA-256 Hash
    const tokenHash = hashToken(grantToken);

    const grant = await prisma.loginGrant.findFirst({
      where: { tokenHash },
      include: {
        assignment: {
          include: {
            project: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!grant) {
      return NextResponse.json(
        { error: "Login grant token is invalid or does not exist.", code: "GRANT_NOT_FOUND" },
        { status: 404, headers: corsHeaders }
      );
    }

    // 3. Strict Single-Use Replay Protection Check
    if (grant.usedAt !== null) {
      return NextResponse.json(
        {
          error: "This login grant has already been consumed (replay attack prevented).",
          code: "GRANT_ALREADY_USED",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 4. Strict TTL Expiration Check (60 seconds)
    const now = new Date();
    if (now > new Date(grant.expiresAt)) {
      return NextResponse.json(
        {
          error: "This login grant has expired (maximum 60-second lifetime exceeded).",
          code: "GRANT_EXPIRED",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 5. Assignment Status Check
    if (grant.assignment.revokedAt !== null) {
      return NextResponse.json(
        {
          error: "Access to this project has been revoked by the agency owner.",
          code: "ASSIGNMENT_REVOKED",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    if (now > new Date(grant.assignment.expiresAt)) {
      return NextResponse.json(
        {
          error: "Access window for this project assignment has expired.",
          code: "ASSIGNMENT_EXPIRED",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 6. Project Status Check
    if (grant.assignment.project.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Project is inactive or archived.",
          code: "PROJECT_INACTIVE",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 7. Atomic Single-Use Token Consumption (Concurrency-Safe)
    const updateResult = await prisma.loginGrant.updateMany({
      where: {
        id: grant.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        {
          error: "This login grant has already been consumed.",
          code: "GRANT_ALREADY_USED",
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // 8. Decrypt Session Cookies
    let cookies: WpCookie[] = [];
    if (
      grant.sessionDataEncrypted &&
      grant.sessionDataIv &&
      grant.sessionDataAuthTag
    ) {
      try {
        const decryptedJson = decryptSecret({
          ciphertext: grant.sessionDataEncrypted,
          iv: grant.sessionDataIv,
          authTag: grant.sessionDataAuthTag,
        });
        cookies = JSON.parse(decryptedJson);
      } catch (decErr: any) {
        console.error("[SESSION_CLAIM_DECRYPT_FAIL]", decErr);
        return NextResponse.json(
          {
            error: "Failed to decrypt authenticated session data.",
            code: "DECRYPTION_FAILED",
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    const { baseUrl, domain } = normalizeWpLoginUrl(grant.assignment.project.targetUrl || "http://localhost");
    const wpAdminUrl = `${baseUrl}/wp-admin/`;

    // 9. Immutable Security Audit Log
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "RenoCompanionExtension/1.0";

    await recordAuditLog({
      userId: grant.assignment.userId,
      projectId: grant.assignment.projectId,
      action: "WP_SESSION_CLAIMED",
      ipAddress: ip,
      userAgent,
      metadata: {
        grantId: grant.id,
        assignmentId: grant.assignmentId,
        cookieCount: cookies.length,
        domain,
        wpRoleTemplate: grant.assignment.wpRoleTemplate,
      },
    });

    // 10. Deliver Session Cookies to Extension Background Memory
    return NextResponse.json(
      {
        success: true,
        assignmentId: grant.assignmentId,
        projectId: grant.assignment.projectId,
        cookies,
        targetUrl: grant.assignment.project.targetUrl,
        wpAdminUrl,
        domain,
        wpRoleTemplate: grant.assignment.wpRoleTemplate,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error: any) {
    console.error("[BROKER_SESSION_CLAIM_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to claim login session.", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
