import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateOtp, verifyOtp } from "@/lib/otp";
import { sendEmailChangeOtpEmail } from "@/lib/brevo";
import { recordAuditLog } from "@/lib/audit";
import { z } from "zod";

const requestOtpSchema = z.object({
  newEmail: z.string().trim().email("Please provide a valid email address"),
});

const verifyOtpSchema = z.object({
  newEmail: z.string().trim().email("Please provide a valid email address"),
  otp: z.string().trim().length(6, "Verification code must be exactly 6 digits"),
});

/**
 * POST /api/profile/email-otp
 * Dispatches a 6-digit verification code to the proposed new email address.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = requestOtpSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const newEmail = parseResult.data.newEmail.toLowerCase();

    // Check if user is trying to change to the same email
    if (newEmail === session.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "New email cannot be identical to your current email address." },
        { status: 400 }
      );
    }

    // Check if new email is already in use by another account
    const existing = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This email address is already associated with another account." },
        { status: 400 }
      );
    }

    // Generate 6-digit cryptographic OTP (10 minute TTL)
    const code = generateOtp("EMAIL_CHANGE", newEmail, 600);

    // Send email via Brevo
    const emailResult = await sendEmailChangeOtpEmail({
      toEmail: newEmail,
      userName: session.user.name || "Administrator",
      otpCode: code,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to dispatch verification email. Please check your Brevo SMTP settings." },
        { status: 500 }
      );
    }

    await recordAuditLog({
      userId: session.user.id,
      action: "EMAIL_CHANGE_OTP_DISPATCHED",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: { proposedEmail: newEmail },
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${newEmail}. Please enter it to confirm the update.`,
      expiresInSeconds: 600,
    });
  } catch (error: any) {
    console.error("[EMAIL_OTP_REQUEST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to dispatch email verification code", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile/email-otp
 * Verifies the 6-digit OTP and commits the email update to PostgreSQL.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = verifyOtpSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { newEmail, otp } = parseResult.data;
    const normalizedEmail = newEmail.toLowerCase();

    // Verify OTP
    const verification = verifyOtp("EMAIL_CHANGE", normalizedEmail, otp);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    // Double check email uniqueness before final update
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { error: "This email address was claimed by another account in the meantime." },
        { status: 400 }
      );
    }

    // Update email in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
      },
    });

    await recordAuditLog({
      userId: session.user.id,
      action: "USER_EMAIL_UPDATED_VIA_OTP",
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: req.headers.get("user-agent") || "Browser",
      metadata: { previousEmail: session.user.email, newEmail: normalizedEmail },
    });

    return NextResponse.json({
      success: true,
      message: "Primary email address verified and updated successfully.",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[EMAIL_OTP_VERIFY_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to verify email and update profile", details: error.message },
      { status: 500 }
    );
  }
}
