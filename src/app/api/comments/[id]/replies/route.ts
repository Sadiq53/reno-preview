import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { z } from "zod";

const replySchema = z.object({
  content: z.string().trim().min(1, "Reply content cannot be empty"),
  guestAuthorName: z.string().trim().optional(),
  shareToken: z.string().optional().nullable(),
});

/**
 * POST /api/comments/[id]/replies
 * Appends a threaded reply to a visual annotation pin.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const parseResult = replySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, guestAuthorName } = parseResult.data;

    // Verify parent comment exists
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }

    if (!session?.user) {
      const shareToken = req.headers.get("x-share-token") || (body as any)?.shareToken;
      if (!shareToken) {
        return NextResponse.json(
          { error: "Authentication or valid Commenter share link required to post replies.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      const shareLink = await prisma.shareLink.findUnique({
        where: { token: shareToken },
      });

      if (!shareLink || shareLink.projectId !== comment.projectId) {
        return NextResponse.json(
          { error: "Invalid share link token for this project.", code: "INVALID_SHARE_TOKEN" },
          { status: 403 }
        );
      }

      if (shareLink.isRevoked || (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date())) {
        return NextResponse.json(
          { error: "This preview share link has expired or been revoked.", code: "SHARE_LINK_INACTIVE" },
          { status: 403 }
        );
      }

      if (shareLink.accessLevel !== "COMMENTER") {
        return NextResponse.json(
          { error: "This share link is Read-Only (Viewer). You cannot post replies.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    } else if (session.user.role === "DEVELOPER") {
      const assignment = await prisma.assignment.findFirst({
        where: {
          projectId: comment.projectId,
          userId: session.user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!assignment) {
        return NextResponse.json(
          { error: "Access denied. You are not assigned to this project." },
          { status: 403 }
        );
      }
    }

    const authorUserId = session?.user?.id || null;
    const finalGuestName = !authorUserId ? (guestAuthorName || "Guest Reviewer") : null;

    const reply = await prisma.commentReply.create({
      data: {
        commentId: id,
        authorUserId,
        guestAuthorName: finalGuestName,
        content,
      },
      include: {
        authorUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Record audit event
    await recordAuditLog({
      userId: authorUserId,
      projectId: comment.projectId,
      action: "COMMENT_REPLY_CREATED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: {
        replyId: reply.id,
        commentId: id,
        pageId: comment.pageId,
      },
    });

    // Realtime notification dispatch
    const responderName = authorUserId
      ? (session?.user?.name || "Team Member")
      : (finalGuestName || "Client Reviewer");
    const snippet = content.slice(0, 50);

    await dispatchNotification({
      type: "QUERY_REPLIED",
      title: "New Query Reply / Feedback Update",
      message: `${responderName} replied: "${snippet}..."`,
      link: `/preview/${comment.projectId}?commentId=${comment.id}`,
      projectId: comment.projectId,
      excludeUserId: authorUserId || undefined,
      metadata: { commentId: id, replyId: reply.id },
    });

    return NextResponse.json({ reply }, { status: 201 });
  } catch (error: any) {
    console.error("[REPLY_POST_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to submit comment reply", details: error.message },
      { status: 500 }
    );
  }
}
