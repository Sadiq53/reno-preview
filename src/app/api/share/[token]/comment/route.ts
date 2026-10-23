import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { recordAuditLog, extractRequestMeta } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { z } from "zod";

const isUuidString = (str?: string | null): boolean =>
  !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const guestCommentSchema = z.object({
  commentId: z.string().uuid().optional(), // If provided, appends a threaded reply
  pageId: z.string().optional().nullable(),
  content: z.string().trim().min(1, "Feedback content cannot be empty"),
  posX: z.number().optional(),
  posY: z.number().optional(),
  viewportWidth: z.number().positive().optional(),
  viewportHeight: z.number().positive().optional(),
  scrollY: z.number().min(0).optional().default(0),
  guestAuthorName: z.string().trim().min(1, "Please provide your name"),
  guestAuthorEmail: z.string().email("Please provide a valid email address").optional().or(z.literal("")).or(z.null()),
});

/**
 * POST /api/share/[token]/comment
 * Allows verified client commenters to submit visual pinpoint annotations or replies.
 * Strictly verifies token validity, non-revoked status, and COMMENTER access role.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();

    const parseResult = guestCommentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      commentId,
      pageId,
      content,
      posX,
      posY,
      viewportWidth,
      viewportHeight,
      scrollY,
      guestAuthorName,
      guestAuthorEmail,
    } = parseResult.data;

    // 1. Verify Share Token
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: { project: true },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: "Invalid share link token", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (shareLink.isRevoked) {
      return NextResponse.json(
        { error: "This share link has been revoked", code: "REVOKED" },
        { status: 403 }
      );
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired", code: "EXPIRED" },
        { status: 403 }
      );
    }

    // Role check: Only COMMENTER can submit comments
    if (shareLink.accessLevel !== "COMMENTER") {
      return NextResponse.json(
        {
          error: "This share link has read-only access (Viewer). You cannot post comments.",
          code: "READ_ONLY",
        },
        { status: 403 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Client Browser";

    // --- CASE A: THREADED REPLY ---
    if (commentId) {
      const parentComment = await prisma.comment.findFirst({
        where: { id: commentId, projectId: shareLink.projectId },
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found for target project", code: "COMMENT_NOT_FOUND" },
          { status: 404 }
        );
      }

      const reply = await prisma.commentReply.create({
        data: {
          commentId,
          authorUserId: null,
          guestAuthorName,
          content,
        },
        include: {
          authorUser: {
            select: { id: true, name: true, role: true, avatarUrl: true },
          },
        },
      });

      await recordAuditLog({
        projectId: shareLink.projectId,
        action: "CLIENT_REPLY_CREATED",
        ipAddress,
        userAgent,
        metadata: {
          replyId: reply.id,
          commentId,
          guestAuthorName,
          guestAuthorEmail: guestAuthorEmail || null,
        },
      });

      // Dispatch isolated notification to project admins and assigned developers
      await dispatchNotification({
        type: "QUERY_REPLIED",
        title: `Client Reply on ${shareLink.project.name}`,
        message: `${guestAuthorName || "Client"} replied: "${content.slice(0, 60)}..."`,
        link: `/preview/${shareLink.projectId}?commentId=${commentId}`,
        projectId: shareLink.projectId,
        metadata: {
          commentId,
          replyId: reply.id,
          clientName: guestAuthorName || "Client",
          projectId: shareLink.projectId,
        },
      });

      return NextResponse.json({ reply }, { status: 201 });
    }

    // --- CASE B: NEW PINPOINT ANNOTATION ---
    if (posX === undefined || posY === undefined || !viewportWidth || !viewportHeight) {
      return NextResponse.json(
        {
          error: "Missing required pin coordinates for new annotation",
          code: "MISSING_COORDINATES",
        },
        { status: 400 }
      );
    }

    // Auto-resolve page robustly (handles "default", missing pageId, or newly created projects with 0 pages)
    let page = null;
    if (isUuidString(pageId)) {
      page = await prisma.projectPage.findFirst({
        where: { id: pageId!, projectId: shareLink.projectId },
      });
    }

    if (!page) {
      page = await prisma.projectPage.findFirst({
        where: { projectId: shareLink.projectId, isDefault: true },
      });
    }

    if (!page) {
      page = await prisma.projectPage.findFirst({
        where: { projectId: shareLink.projectId },
        orderBy: { displayOrder: "asc" },
      });
    }

    if (!page) {
      page = await prisma.projectPage.create({
        data: {
          projectId: shareLink.projectId,
          path: "/",
          fullUrl: shareLink.project.targetUrl || "/",
          title: "Home",
          isDefault: true,
          displayOrder: 1,
        },
      });
    }

    const clampedPosX = Math.max(0, Math.min(100, Number(posX.toFixed(2))));
    const clampedPosY = Math.max(0, Math.min(100, Number(posY.toFixed(2))));
    const roundedViewportWidth = Math.round(viewportWidth);
    const roundedViewportHeight = Math.round(viewportHeight);
    const roundedScrollY = Math.round(scrollY || 0);

    const comment = await prisma.comment.create({
      data: {
        projectId: shareLink.projectId,
        pageId: page.id,
        authorUserId: null,
        guestAuthorName,
        guestAuthorEmail: guestAuthorEmail || null,
        content,
        posX: clampedPosX,
        posY: clampedPosY,
        viewportWidth: roundedViewportWidth,
        viewportHeight: roundedViewportHeight,
        scrollY: roundedScrollY,
        status: "PENDING",
      },
      include: {
        authorUser: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        page: {
          select: { id: true, path: true, title: true, fullUrl: true },
        },
        replies: true,
      },
    });

    await recordAuditLog({
      projectId: shareLink.projectId,
      action: "CLIENT_COMMENT_CREATED",
      ipAddress,
      userAgent,
      metadata: {
        commentId: comment.id,
        pageId: page.id,
        pagePath: page.path,
        guestAuthorName,
        guestAuthorEmail: guestAuthorEmail || null,
        posX: clampedPosX,
        posY: clampedPosY,
        viewport: `${roundedViewportWidth}x${roundedViewportHeight}`,
      },
    });

    // Realtime notification dispatch to project team (Admins + Assigned Developers only)
    await dispatchNotification({
      type: "COMMENT_CREATED",
      title: `Client Feedback on ${shareLink.project.name}`,
      message: `${guestAuthorName || "Client"} posted: "${content.slice(0, 60)}..."`,
      link: `/preview/${shareLink.projectId}?commentId=${comment.id}`,
      projectId: shareLink.projectId,
      metadata: {
        commentId: comment.id,
        pagePath: page.path,
        clientName: guestAuthorName || "Client",
        projectId: shareLink.projectId,
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error("[GUEST_COMMENT_POST_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to persist client comment", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/share/[token]/comment
 * Allows verified client commenters to delete their own visual comments only.
 * Client cannot delete admin or developer comments, or comments created by other users.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    const guestAuthorName = searchParams.get("guestAuthorName");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required", code: "MISSING_ID" },
        { status: 400 }
      );
    }

    // 1. Verify Share Token
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: { project: true },
    });

    if (!shareLink) {
      return NextResponse.json(
        { error: "Invalid share link token", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (shareLink.isRevoked) {
      return NextResponse.json(
        { error: "This share link has been revoked", code: "REVOKED" },
        { status: 403 }
      );
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired", code: "EXPIRED" },
        { status: 403 }
      );
    }

    if (shareLink.accessLevel !== "COMMENTER") {
      return NextResponse.json(
        { error: "Read-only access. You do not have permission to delete comments.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // 2. Fetch the target comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.projectId !== shareLink.projectId) {
      return NextResponse.json(
        { error: "Comment not found for this project", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. Strict Ownership Rule: Client can ONLY delete their own comment!
    // Cannot delete comments made by agency team members (authorUserId !== null)
    if (comment.authorUserId !== null) {
      return NextResponse.json(
        { error: "You can only delete your own client comments.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Must match guestAuthorName if comment has one and guestAuthorName is provided
    if (
      guestAuthorName &&
      comment.guestAuthorName &&
      comment.guestAuthorName.trim().toLowerCase() !== guestAuthorName.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "You can only delete comments created by you.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // 4. Delete replies first, then delete the comment
    await prisma.commentReply.deleteMany({
      where: { commentId },
    });

    await prisma.comment.delete({
      where: { id: commentId },
    });

    const meta = extractRequestMeta(req);

    await recordAuditLog({
      projectId: shareLink.projectId,
      action: "CLIENT_COMMENT_DELETED",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        commentId,
        guestAuthorName: comment.guestAuthorName,
        deletedBy: guestAuthorName || comment.guestAuthorName,
      },
    });

    return NextResponse.json({ success: true, deletedId: commentId });
  } catch (error: any) {
    console.error("[GUEST_COMMENT_DELETE_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to delete client comment", details: error.message },
      { status: 500 }
    );
  }
}
