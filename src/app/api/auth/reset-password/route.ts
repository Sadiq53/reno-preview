import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyOtp } from "@/lib/otp";
import { recordAuditLog } from "@/lib/audit";
import { z } from "zod";

const resetPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  otp: z.string().trim().length(6, "Verification code must be exactly 6 digits"),
  newPassword: z.string().min(8, "New password must be at least 8 characters long"),
});

/**
 * POST /api/auth/reset-password
 * Public endpoint to verify the 6-digit 2FA code and commit the new password.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = resetPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, otp, newPassword } = parseResult.data;
    const normalizedEmail = email.toLowerCase();

    // Verify 6-digit OTP
    const verification = verifyOtp("PASSWORD_RESET", normalizedEmail, otp);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired 2FA recovery code." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This account is suspended. Please contact your agency administrator." },
        { status: 403 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate pending login grants
    await prisma.loginGrant.deleteMany({
      where: { assignment: { userId: user.id } },
    });

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Browser";

    await recordAuditLog({
      userId: user.id,
      action: "PASSWORD_RESET_VIA_2FA_EMAIL",
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been successfully updated. You can now sign in with your new credentials.",
    });
  } catch (error: any) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to reset password", details: error.message },
      { status: 500 }
    );
  }
}
