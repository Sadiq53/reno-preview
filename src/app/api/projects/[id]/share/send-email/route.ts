import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateSecureToken } from "@/lib/crypto";
import { recordAuditLog } from "@/lib/audit";
import { sendPreviewShareEmail } from "@/lib/brevo";
import { z } from "zod";

const sendShareEmailSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  clientId: z.string().optional(),
  accessLevel: z.enum(["VIEWER", "COMMENTER"]).default("VIEWER"),
  expiresInDays: z.number().int().positive().nullable().optional(),
  customNote: z.string().optional(),
});

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
    const parseResult = sendShareEmailSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { recipientEmail, recipientName, clientId, accessLevel, expiresInDays, customNote } = parseResult.data;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // If clientId provided and no recipientName, use client's name
    let resolvedRecipientName = recipientName;
    if (!resolvedRecipientName && clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (client) {
        resolvedRecipientName = client.name;
      }
    }

    // Generate 256-bit cryptographically secure token
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
    const clientDisplayName = resolvedRecipientName || project.clientName || undefined;
    const queryParams = new URLSearchParams();
    if (clientDisplayName) queryParams.set("name", clientDisplayName);
    if (recipientEmail) queryParams.set("email", recipientEmail);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const shareUrl = `${protocol}://${host}/share/${token}${queryString}`;

    // Dispatch via Brevo
    const emailResult = await sendPreviewShareEmail({
      recipientEmail,
      recipientName: resolvedRecipientName,
      projectName: project.name,
      shareUrl,
      accessLevel,
      senderName: session.user.name || "Agency Owner",
      customNote,
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "SHARE_LINK_EMAILED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: {
        recipientEmail,
        recipientName: resolvedRecipientName,
        accessLevel,
        expiresInDays: expiresInDays || "never",
        shareLinkId: shareLink.id,
        simulated: emailResult.simulated || false,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: emailResult.simulated
          ? `Simulated preview invitation sent to ${recipientEmail}`
          : `Preview invitation sent to ${recipientEmail}`,
        shareUrl,
        shareLink: {
          ...shareLink,
          isExpired: false,
          isActive: true,
          shareUrl,
        },
        emailResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[SEND_SHARE_EMAIL_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to dispatch preview invitation email", details: error.message },
      { status: 500 }
    );
  }
}
