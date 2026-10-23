import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

/**
 * GET /api/share/[token]
 * Public endpoint to validate a client share token and retrieve scoped preview data.
 * STRICT SECURITY GUARANTEE: Never exposes credentials, developer rosters, or admin configs.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Share token is required", code: "TOKEN_REQUIRED" },
        { status: 400 }
      );
    }

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            targetUrl: true,
            status: true,
            pages: {
              where: { isHidden: false },
              select: {
                id: true,
                path: true,
                fullUrl: true,
                title: true,
                isDefault: true,
                displayOrder: true,
              },
              orderBy: { displayOrder: "asc" },
            },
            comments: {
              include: {
                authorUser: {
                  select: { id: true, name: true, role: true, avatarUrl: true },
                },
                resolvedByUser: {
                  select: { id: true, name: true, role: true },
                },
                page: {
                  select: { id: true, path: true, title: true, fullUrl: true },
                },
                replies: {
                  include: {
                    authorUser: {
                      select: { id: true, name: true, role: true, avatarUrl: true },
                    },
                  },
                  orderBy: { createdAt: "asc" },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    // 1. Check if token exists
    if (!shareLink) {
      return NextResponse.json(
        { error: "Invalid share link. The preview link you entered does not exist.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2. Check if revoked
    if (shareLink.isRevoked) {
      return NextResponse.json(
        {
          error: "This share link has been revoked by the agency administrator.",
          code: "REVOKED",
        },
        { status: 403 }
      );
    }

    // 3. Check if expired
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: "This share link has expired. Please contact the project administrator for a new preview link.",
          code: "EXPIRED",
        },
        { status: 403 }
      );
    }

    // Record audit event for client access
    await recordAuditLog({
      projectId: shareLink.projectId,
      action: "SHARE_LINK_ACCESSED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Client Browser",
      metadata: {
        shareLinkId: shareLink.id,
        accessLevel: shareLink.accessLevel,
      },
    });

    return NextResponse.json({
      accessLevel: shareLink.accessLevel,
      expiresAt: shareLink.expiresAt,
      project: {
        id: shareLink.project.id,
        name: shareLink.project.name,
        clientName: shareLink.project.clientName,
        targetUrl: shareLink.project.targetUrl,
        status: shareLink.project.status,
      },
      pages: shareLink.project.pages,
      comments: shareLink.project.comments,
    });
  } catch (error: any) {
    console.error("[SHARE_TOKEN_GET_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to validate share link", details: error.message },
      { status: 500 }
    );
  }
}
