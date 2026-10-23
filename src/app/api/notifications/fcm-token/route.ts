import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

const tokenSchema = z.object({
  token: z.string().trim().min(10, "Invalid FCM token"),
  device: z.string().trim().optional(),
});

/**
 * POST /api/notifications/fcm-token
 * Registers or updates a device FCM token for background Web Push delivery.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = tokenSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, device } = parseResult.data;

    const fcmRecord = await prisma.fcmToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        device: device || null,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        token,
        device: device || null,
      },
    });

    return NextResponse.json({ success: true, id: fcmRecord.id });
  } catch (error: any) {
    console.error("[FCM_TOKEN_REGISTER_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to register FCM token", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/fcm-token
 * Deregisters an FCM token on logout or permission revocation.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (token) {
      await prisma.fcmToken.deleteMany({
        where: {
          token,
          userId: session.user.id,
        },
      });
    } else {
      // Purge all tokens for this user
      await prisma.fcmToken.deleteMany({
        where: {
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({ success: true, message: "FCM token deregistered" });
  } catch (error: any) {
    console.error("[FCM_TOKEN_DELETE_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to unregister FCM token", details: error.message },
      { status: 500 }
    );
  }
}
