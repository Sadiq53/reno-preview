import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { recordAuditLog } from "@/lib/audit";
import { sendAccountSuspensionEmail, sendAccountReactivationEmail } from "@/lib/brevo";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, name, resetPassword, duration, reason } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { revokedAt: null },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safety guard: Admin cannot suspend or delete self or another ADMIN
    if (targetUser.role === "ADMIN" && (action === "SUSPEND" || targetUser.id === session.user.id)) {
      return NextResponse.json(
        { error: "Cannot suspend or modify an Agency Owner / Admin account" },
        { status: 400 }
      );
    }

    // --- ACTION: SUSPEND DEVELOPER ---
    if (action === "SUSPEND") {
      let suspendedUntil: Date | null = null;
      let durationLabel = "Permanent / Indefinite";

      if (duration === "24h") {
        suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        durationLabel = "24 Hours";
      } else if (duration === "3d") {
        suspendedUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        durationLabel = "3 Days";
      } else if (duration === "7d") {
        suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        durationLabel = "7 Days";
      } else if (duration === "30d") {
        suspendedUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        durationLabel = "30 Days";
      } else if (duration && typeof duration === "string" && duration !== "permanent") {
        const parsed = new Date(duration);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
          suspendedUntil = parsed;
          durationLabel = `Until ${parsed.toLocaleDateString()}`;
        }
      }

      const suspendReason = (reason && typeof reason === "string" && reason.trim())
        ? reason.trim()
        : "Administrative account suspension";

      // 1. Update user status in database
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          status: "SUSPENDED",
          suspendedUntil,
          suspendReason,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          suspendedUntil: true,
          suspendReason: true,
          avatarUrl: true,
        },
      });

      // 2. Immediately kick out from active projects: revoke active assignments
      await prisma.assignment.updateMany({
        where: {
          userId: id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // 3. Invalidate any pending login grants
      await prisma.loginGrant.deleteMany({
        where: {
          assignment: {
            userId: id,
          },
        },
      });

      // 4. Purge FCM tokens & disconnect active SSE connections so suspended users receive no notifications
      await prisma.fcmToken.deleteMany({
        where: { userId: id },
      });
      const sseSubscribersMap = (globalThis as any).__vanguardSseSubscribers || (globalThis as any).__renoSseSubscribers;
      if (sseSubscribersMap && sseSubscribersMap.has(id)) {
        sseSubscribersMap.delete(id);
      }
      if ((globalThis as any).__renoSseSubscribers?.has(id)) {
        (globalThis as any).__renoSseSubscribers.delete(id);
      }

      // 4. Send official Brevo suspension email notice
      try {
        await sendAccountSuspensionEmail({
          developerEmail: targetUser.email,
          developerName: targetUser.name,
          durationText: durationLabel,
          reason: suspendReason,
          suspendedUntil,
        });
      } catch (mailErr) {
        console.error("[SUSPENSION_EMAIL_FAILED]", mailErr);
      }

      // 5. Record immutable audit log
      await recordAuditLog({
        userId: session.user.id,
        action: "MEMBER_SUSPENDED",
        metadata: {
          targetUserId: id,
          targetEmail: targetUser.email,
          duration: durationLabel,
          reason: suspendReason,
          suspendedUntil: suspendedUntil?.toISOString() || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Account for ${targetUser.name} has been suspended (${durationLabel}).`,
        developer: updatedUser,
      });
    }

    // --- ACTION: REACTIVATE DEVELOPER ---
    if (action === "REACTIVATE") {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          status: "ACTIVE",
          suspendedUntil: null,
          suspendReason: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          suspendedUntil: true,
          suspendReason: true,
          avatarUrl: true,
        },
      });

      // Send official Brevo reactivation email notice
      try {
        const host =
          req.headers.get("x-forwarded-host") ||
          req.headers.get("host") ||
          process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
          "vanguard.crewvia.in";
        const protocol =
          req.headers.get("x-forwarded-proto") ||
          (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
        const loginUrl = `${protocol}://${host}/login`;

        await sendAccountReactivationEmail({
          developerEmail: targetUser.email,
          developerName: targetUser.name,
          loginUrl,
        });
      } catch (mailErr) {
        console.error("[REACTIVATION_EMAIL_FAILED]", mailErr);
      }

      // Record immutable audit log
      await recordAuditLog({
        userId: session.user.id,
        action: "MEMBER_REACTIVATED",
        metadata: {
          targetUserId: id,
          targetEmail: targetUser.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Account for ${targetUser.name} has been reactivated.`,
        developer: updatedUser,
      });
    }

    // --- DEFAULT: NAME / PASSWORD UPDATE ---
    const dataToUpdate: any = {};
    if (name && typeof name === "string") {
      dataToUpdate.name = name.trim();
    }

    let newTempPassword: string | null = null;
    if (resetPassword) {
      newTempPassword = `Reno-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      dataToUpdate.passwordHash = await bcrypt.hash(newTempPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedUntil: true,
        suspendReason: true,
        avatarUrl: true,
      },
    });

    await recordAuditLog({
      userId: session.user.id,
      action: resetPassword ? "PASSWORD_RESET" : "MEMBER_UPDATED",
      metadata: { targetUserId: id, targetEmail: updated.email },
    });

    return NextResponse.json({
      developer: updated,
      newPassword: newTempPassword,
    });
  } catch (error: any) {
    console.error("[TEAM_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update team member", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safety guard: Never allow deleting an ADMIN account from developer roster
    if (targetUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete an Agency Owner / Admin account" },
        { status: 400 }
      );
    }

    // Safety guard: Cannot delete self
    if (targetUser.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own active account" },
        { status: 400 }
      );
    }

    // 1. Cleanly delete user assignments and login grants first
    await prisma.loginGrant.deleteMany({
      where: {
        assignment: {
          userId: id,
        },
      },
    });

    await prisma.assignment.deleteMany({
      where: {
        userId: id,
      },
    });

    // 2. Explicitly purge all FCM tokens so the deleted user never receives notifications
    await prisma.fcmToken.deleteMany({
      where: { userId: id },
    });

    // 3. Disconnect and clean up active SSE subscriber stream
    const sseMap = (globalThis as any).__vanguardSseSubscribers || (globalThis as any).__renoSseSubscribers;
    if (sseMap && sseMap.has(id)) {
      sseMap.delete(id);
    }
    if ((globalThis as any).__renoSseSubscribers?.has(id)) {
      (globalThis as any).__renoSseSubscribers.delete(id);
    }

    // 4. Clean up pending in-app notifications
    await prisma.notification.deleteMany({
      where: { userId: id },
    });

    // 5. Permanently delete the user row from PostgreSQL
    await prisma.user.delete({
      where: { id },
    });

    // 3. Record audit log
    await recordAuditLog({
      userId: session.user.id,
      action: "MEMBER_PERMANENTLY_DELETED",
      metadata: { removedEmail: targetUser.email, removedName: targetUser.name, targetUserId: id },
    });

    return NextResponse.json({
      success: true,
      deletedId: id,
      message: `Account for ${targetUser.name} (${targetUser.email}) has been permanently deleted. Any active session will be immediately logged out.`,
    });
  } catch (error: any) {
    console.error("[TEAM_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete team member", details: error.message },
      { status: 500 }
    );
  }
}

