import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { dispatchNotification, getActiveSseSubscribersCount } from "@/lib/notifications";
import { getFirebaseAdminStatus } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/notifications/test
 * Diagnostic endpoint returning real-time health of Notification Engine & FCM.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const firebaseStatus = getFirebaseAdminStatus();
    const activeSubscribers = getActiveSseSubscribersCount();
    const userSubscribers = getActiveSseSubscribersCount(session.user.id);

    const [userTokens, totalTokens, recentNotifications] = await Promise.all([
      prisma.fcmToken.findMany({
        where: { userId: session.user.id },
        select: { id: true, device: true, createdAt: true, updatedAt: true },
      }),
      prisma.fcmToken.count(),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      status: "ok",
      currentUser: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
      firebaseAdmin: firebaseStatus,
      sseStreaming: {
        globalActiveSubscribers: activeSubscribers,
        currentUserActiveSubscribers: userSubscribers,
        status: userSubscribers > 0 ? "CONNECTED" : "IDLE",
      },
      fcmWebPush: {
        registeredTokensForCurrentUser: userTokens.length,
        totalTokensInDatabase: totalTokens,
        tokens: userTokens,
      },
      recentNotifications,
      instruction: firebaseStatus.isConfigured
        ? "Firebase Admin is initialized. Background Web Push and real-time SSE are ready."
        : "Firebase Admin is in graceful fallback. Place serviceAccountKey.json in the project root or configure FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Diagnostic failed", details: error.message }, { status: 500 });
  }
}

/**
 * POST /api/notifications/test
 * Triggers a live test notification to the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = body.title || "Reno Hub Notification Test";
    const message = body.message || `Test notification dispatched at ${new Date().toLocaleTimeString()}!`;

    await dispatchNotification({
      type: "TASK_ASSIGNED",
      title,
      message,
      link: "/developer/tasks",
      userId: session.user.id,
      metadata: { testDispatch: true, timestamp: Date.now() },
    });

    return NextResponse.json({
      success: true,
      message: "Test notification dispatched to database, real-time SSE bus, and FCM Web Push.",
      targetUserId: session.user.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Test dispatch failed", details: error.message }, { status: 500 });
  }
}
