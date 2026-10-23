import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { sendDeveloperCredentialsEmail } from "@/lib/brevo";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { developerId, password } = body;

    if (!developerId || typeof developerId !== "string") {
      return NextResponse.json({ error: "developerId is required" }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "password string is required to email credentials" }, { status: 400 });
    }

    const developer = await prisma.user.findUnique({
      where: { id: developerId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!developer || developer.role !== "DEVELOPER") {
      return NextResponse.json({ error: "Developer user not found" }, { status: 404 });
    }

    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ||
      "vanguard.crewvia.in";
    const protocol =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
    const loginUrl = `${protocol}://${host}/login`;

    const emailResult = await sendDeveloperCredentialsEmail({
      developerEmail: developer.email,
      developerName: developer.name,
      temporaryPassword: password,
      loginUrl,
    });

    await recordAuditLog({
      userId: session.user.id,
      action: "CREDENTIALS_EMAILED",
      metadata: {
        developerId: developer.id,
        developerEmail: developer.email,
        simulated: emailResult.simulated || false,
      },
    });

    return NextResponse.json({
      success: true,
      message: emailResult.simulated
        ? `Simulated credentials email sent to ${developer.email}`
        : `Credentials email dispatched to ${developer.email}`,
      simulated: emailResult.simulated || false,
    });
  } catch (error: any) {
    console.error("[SEND_CREDENTIALS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to send credentials email", details: error.message },
      { status: 500 }
    );
  }
}
