import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notifications";
import { z } from "zod";

const isUuidString = (str?: string | null): boolean =>
  !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const createCommentSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  pageId: z.string().optional().nullable(),
  content: z.string().trim().min(1, "Comment content cannot be empty"),
  posX: z.number(),
  posY: z.number(),
  viewportWidth: z.number().positive(),
  viewportHeight: z.number().positive(),
  scrollY: z.number().min(0).optional().default(0),
  guestAuthorName: z.string().trim().optional().nullable(),
  guestAuthorEmail: z.string().email().optional().or(z.literal("")).or(z.null()),
  shareToken: z.string().optional().nullable(),
});

/**
 * GET /api/comments?projectId=UUID&pageId=UUID
 * Fetches all visual pinpoint comments for a project or specific page,
 * including author avatars, metadata, and threaded replies.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const pageId = searchParams.get("pageId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required", code: "MISSING_PROJECT_ID" },
        { status: 400 }
      );
    }

    // Only filter by pageId if it is a valid UUID and not "default"
    const validPageId = pageId && pageId !== "default" && isUuidString(pageId) ? pageId : undefined;

    const comments = await prisma.comment.findMany({
      where: {
        projectId,
        ...(validPageId ? { pageId: validPageId } : {}),
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
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        assigneeUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        page: {
          select: {
            id: true,
            path: true,
            title: true,
            fullUrl: true,
          },
        },
        replies: {
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
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const session = await getServerSession(authOptions);
    const isDeveloper = session?.user?.role === "DEVELOPER";

    const sanitizedComments = isDeveloper
      ? comments.map((c) => ({
          ...c,
          guestAuthorName: !c.authorUserId || c.guestAuthorName ? "Client" : c.guestAuthorName,
          guestAuthorEmail: null,
          replies: c.replies.map((r) => ({
            ...r,
            guestAuthorName: !r.authorUserId || r.guestAuthorName ? "Client" : r.guestAuthorName,
          })),
        }))
      : comments;

    return NextResponse.json({ comments: sanitizedComments });
  } catch (error: any) {
    console.error("[COMMENTS_GET_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project comments", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comments
 * Creates a new pinpoint annotation with normalized coordinates and viewport geometry.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const parseResult = createCommentSchema.safeParse(body);
    if (!parseResult.success) {
      console.warn("[COMMENTS_VALIDATION_ERROR]", {
        body,
        errors: parseResult.error.flatten().fieldErrors,
      });
      return NextResponse.json(
        {
          error: "Validation error",
          code: "VALIDATION_FAILED",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      projectId,
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

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Strict Authorization Guard: Authenticated User OR Verified COMMENTER Share Token
    if (!session?.user) {
      const shareToken = req.headers.get("x-share-token") || (body as any)?.shareToken;
      if (!shareToken) {
        return NextResponse.json(
          {
            error: "Authentication or valid Commenter share link required to post annotations.",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }

      const shareLink = await prisma.shareLink.findUnique({
        where: { token: shareToken },
      });

      if (!shareLink || shareLink.projectId !== projectId) {
        return NextResponse.json(
          { error: "Invalid share link token for this project.", code: "INVALID_SHARE_TOKEN" },
          { status: 403 }
        );
      }

      if (shareLink.isRevoked) {
        return NextResponse.json(
          { error: "This preview share link has been revoked.", code: "SHARE_LINK_REVOKED" },
          { status: 403 }
        );
      }

      if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "This preview share link has expired.", code: "SHARE_LINK_EXPIRED" },
          { status: 403 }
        );
      }

      if (shareLink.accessLevel !== "COMMENTER") {
        return NextResponse.json(
          {
            error: "This share link is Read-Only (Viewer). You cannot post comments.",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }
    } else if (session.user.role === "DEVELOPER") {
      const assignment = await prisma.assignment.findFirst({
        where: {
          projectId,
          userId: session.user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to this project.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    }

    // Auto-resolve page robustly (handles "default", missing pageId, or newly created projects with 0 pages)
    let page = null;
    if (isUuidString(pageId)) {
      page = await prisma.projectPage.findFirst({
        where: { id: pageId!, projectId },
      });
    }

    if (!page) {
      page = await prisma.projectPage.findFirst({
        where: { projectId, isDefault: true },
      });
    }

    if (!page) {
      page = await prisma.projectPage.findFirst({
        where: { projectId },
        orderBy: { displayOrder: "asc" },
      });
    }

    // If still no page exists in DB for this project, auto-create the root Home page
    if (!page) {
      page = await prisma.projectPage.create({
        data: {
          projectId,
          path: "/",
          fullUrl: project.targetUrl || "/",
          title: "Home",
          isDefault: true,
          displayOrder: 1,
        },
      });
    }

    // Clamp coordinates safely
    const clampedPosX = Math.max(0, Math.min(100, Number(posX.toFixed(2))));
    const clampedPosY = Math.max(0, Math.min(100, Number(posY.toFixed(2))));
    const roundedViewportWidth = Math.round(viewportWidth);
    const roundedViewportHeight = Math.round(viewportHeight);
    const roundedScrollY = Math.round(scrollY || 0);

    // Determine author identity
    const authorUserId = session?.user?.id || null;
    const finalGuestName = !authorUserId ? (guestAuthorName || "Guest Reviewer") : null;
    const finalGuestEmail = !authorUserId ? (guestAuthorEmail || null) : null;

    const comment = await prisma.comment.create({
      data: {
        projectId,
        pageId: page.id,
        authorUserId,
        guestAuthorName: finalGuestName,
        guestAuthorEmail: finalGuestEmail,
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
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
        page: {
          select: {
            id: true,
            path: true,
            title: true,
            fullUrl: true,
          },
        },
        replies: true,
      },
    });

    // Record audit entry
    await recordAuditLog({
      userId: authorUserId,
      projectId,
      action: "COMMENT_CREATED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: {
        commentId: comment.id,
        pageId: page.id,
        pagePath: page.path,
        posX: clampedPosX,
        posY: clampedPosY,
        viewport: `${roundedViewportWidth}x${roundedViewportHeight}`,
      },
    });

    // Realtime notification dispatch
    const authorDisplayName = authorUserId
      ? (session?.user?.name || "Team Member")
      : (finalGuestName || "Client Reviewer");
    const snippet = content.slice(0, 50);

    await dispatchNotification({
      type: "COMMENT_CREATED",
      title: `New Feedback on ${page.title || page.path || "Website"}`,
      message: `${authorDisplayName} posted: "${snippet}..."`,
      link: `/preview/${projectId}?commentId=${comment.id}`,
      projectId,
      excludeUserId: authorUserId || undefined,
      metadata: { commentId: comment.id, pagePath: page.path },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error("[COMMENTS_POST_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to persist annotation comment", details: error.message },
      { status: 500 }
    );
  }
}
