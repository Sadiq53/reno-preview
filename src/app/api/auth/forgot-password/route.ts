import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateOtp } from "@/lib/otp";
import { sendPasswordRecoveryOtpEmail } from "@/lib/brevo";
import { recordAuditLog } from "@/lib/audit";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
});

/**
 * POST /api/auth/forgot-password
 * Public endpoint to request a 6-digit 2FA password recovery code via email.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = forgotPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const email = parseResult.data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Browser";

    // For security and privacy, if user not found, return generic success message to prevent user enumeration
    if (!user || user.status === "SUSPENDED") {
      return NextResponse.json({
        success: true,
        message: "If an active account exists with this email address, a 6-digit 2FA recovery code has been dispatched.",
      });
    }

    // Generate 6-digit OTP (10 minute TTL)
    const code = generateOtp("PASSWORD_RESET", email, 600, { userId: user.id });

    // Send email via Brevo
    await sendPasswordRecoveryOtpEmail({
      toEmail: user.email,
      userName: user.name,
      otpCode: code,
    });

    await recordAuditLog({
      userId: user.id,
      action: "2FA_PASSWORD_RECOVERY_REQUESTED",
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      message: "If an active account exists with this email address, a 6-digit 2FA recovery code has been dispatched.",
    });
  } catch (error: any) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process 2FA password reset request", details: error.message },
      { status: 500 }
    );
  }
}
