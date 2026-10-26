import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { recordPresenceHeartbeat, recordPresenceTabClosed, getDeveloperPresence, formatFriendlyTimeAgo } from "@/lib/presence";
import { recordAuditLog, extractRequestMeta } from "@/lib/audit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-grant-token",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Real-Time Developer WordPress Admin Presence API
 * Receives active heartbeats and tab closure events from the Companion Extension.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action = "HEARTBEAT",
      domain,
      assignmentId,
      userId,
      device,
      tabCount = 1,
      path,
    } = body;

    if (!domain && !assignmentId) {
      return NextResponse.json(
        { error: "domain or assignmentId is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { ipAddress, userAgent } = extractRequestMeta(req);

    // Look up assignment and user details if assignmentId is provided
    let resolvedProjectId: string | undefined;
    let resolvedUserId: string | undefined = userId;
    let resolvedUserName: string | undefined;
    let resolvedUserEmail: string | undefined;

    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { user: true },
      });
      if (assignment) {
        resolvedProjectId = assignment.projectId;
        resolvedUserId = assignment.userId;
        resolvedUserName = assignment.user.name || undefined;
        resolvedUserEmail = assignment.user.email;
      }
    }

    if (action === "TAB_CLOSED" || action === "WP_ADMIN_CLOSED") {
      const closed = recordPresenceTabClosed({
        domain: domain || "",
        assignmentId,
        userId: resolvedUserId,
        remainingTabs: body.remainingTabs || 0,
      });

      // Record audit log for tab closure
      if (resolvedUserId || assignmentId) {
        await recordAuditLog({
          userId: resolvedUserId,
          projectId: resolvedProjectId,
          action: "WP_ADMIN_TAB_CLOSED",
          ipAddress,
          userAgent: device || userAgent,
          metadata: {
            domain,
            assignmentId,
            remainingTabs: body.remainingTabs || 0,
            closedAt: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          action: "TAB_CLOSED",
          isActive: false,
          lastActiveAt: closed?.closedAt ? new Date(closed.closedAt).toISOString() : new Date().toISOString(),
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Default: HEARTBEAT / WP_ADMIN_ACTIVE
    const record = recordPresenceHeartbeat({
      domain: domain || "",
      assignmentId,
      userId: resolvedUserId,
      userEmail: resolvedUserEmail,
      userName: resolvedUserName,
      device: device || userAgent,
      ipAddress,
      tabCount: Number(tabCount) || 1,
    });

    return NextResponse.json(
      {
        success: true,
        action: "HEARTBEAT_RECORDED",
        isActive: true,
        lastHeartbeatAt: new Date(record.lastHeartbeatAt).toISOString(),
        tabCount: record.tabCount,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[BROKER_PRESENCE_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to record presence", details: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Query current developer presence in WordPress admin
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId") || undefined;
    const domain = searchParams.get("domain") || undefined;
    const userId = searchParams.get("userId") || undefined;

    const presence = getDeveloperPresence({ assignmentId, domain, userId });

    return NextResponse.json(
      {
        isActive: presence.isActive,
        lastActiveAt: presence.lastActiveAt ? presence.lastActiveAt.toISOString() : null,
        lastActiveFormatted: presence.lastActiveAt ? formatFriendlyTimeAgo(presence.lastActiveAt) : "Never",
        closedAt: presence.closedAt ? presence.closedAt.toISOString() : null,
        tabCount: presence.tabCount,
        device: presence.device,
        ipAddress: presence.ipAddress,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[BROKER_PRESENCE_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Failed to get presence", details: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
