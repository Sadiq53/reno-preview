import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateSecureToken } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";
import { z } from "zod";

const createShareLinkSchema = z.object({
  accessLevel: z.enum(["VIEWER", "COMMENTER"]).default("VIEWER"),
  expiresInDays: z.number().int().positive().nullable().optional(),
});

/**
 * GET /api/projects/[id]/share
 * Lists all active and historical share links for the given project (Admin only).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Agency owner (ADMIN) permissions required." },
        { status: 403 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const shareLinks = await prisma.shareLink.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
      "vanguard.crewvia.in";
    const protocol =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    const origin = `${protocol}://${host}`;

    const formattedLinks = shareLinks.map((link) => {
      const isExpired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false;
      const isActive = !link.isRevoked && !isExpired;

      return {
        ...link,
        isExpired,
        isActive,
        shareUrl: `${origin}/share/${link.token}`,
      };
    });

    return NextResponse.json({ shareLinks: formattedLinks });
  } catch (error: any) {
    console.error("[SHARE_LINKS_GET_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project share links", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/share
 * Generates a cryptographically secure 256-bit URL-safe share token with scoped access role.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Agency owner (ADMIN) permissions required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = createShareLinkSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { accessLevel, expiresInDays } = parseResult.data;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 256-bit (32 bytes) cryptographically random URL-safe token
    const token = generateSecureToken(32);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        projectId: id,
        token,
        accessLevel,
        expiresAt,
        isRevoked: false,
      },
    });

    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
      "vanguard.crewvia.in";
    const protocol =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    const shareUrl = `${protocol}://${host}/share/${token}`;

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "SHARE_LINK_CREATED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: {
        shareLinkId: shareLink.id,
        accessLevel,
        expiresInDays: expiresInDays || "never",
        expiresAt: expiresAt?.toISOString() || null,
      },
    });

    return NextResponse.json(
      {
        shareLink: {
          ...shareLink,
          isExpired: false,
          isActive: true,
          shareUrl,
        },
        shareUrl,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[SHARE_LINK_POST_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to generate share link", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/share?linkId=UUID
 * Instantly revokes an active client share link.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Agency owner (ADMIN) permissions required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");

    if (!linkId) {
      return NextResponse.json(
        { error: "linkId query parameter is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.shareLink.findFirst({
      where: { id: linkId, projectId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const revoked = await prisma.shareLink.update({
      where: { id: linkId },
      data: { isRevoked: true },
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "SHARE_LINK_REVOKED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: { shareLinkId: linkId, accessLevel: existing.accessLevel },
    });

    return NextResponse.json({ success: true, revokedLink: revoked });
  } catch (error: any) {
    console.error("[SHARE_LINK_DELETE_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to revoke share link", details: error.message },
      { status: 500 }
    );
  }
}
