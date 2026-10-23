import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { recordAuditLog } from "@/lib/audit";
import { sendDeveloperCredentialsEmail } from "@/lib/brevo";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const developers = await prisma.user.findMany({
      where: { role: "DEVELOPER" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedUntil: true,
        suspendReason: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            assignments: true,
            commentsAuthored: true,
            commentsResolved: true,
          },
        },
        assignments: {
          select: {
            id: true,
            expiresAt: true,
            revokedAt: true,
            wpRoleTemplate: true,
            project: {
              select: {
                id: true,
                name: true,
                clientName: true,
                targetUrl: true,
              },
            },
          },
        },
      },
    });

    const transformed = developers.map((dev) => ({
      id: dev.id,
      name: dev.name,
      email: dev.email,
      role: dev.role,
      status: dev.status,
      suspendedUntil: dev.suspendedUntil,
      suspendReason: dev.suspendReason,
      avatarUrl: dev.avatarUrl,
      createdAt: dev.createdAt,
      assignedProjectsCount: dev._count.assignments,
      commentsCount: dev._count.commentsAuthored,
      resolvedCount: dev._count.commentsResolved,
      assignments: dev.assignments,
    }));

    return NextResponse.json({ developers: transformed });
  } catch (error: any) {
    console.error("[TEAM_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to retrieve developer roster", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, customPassword } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Developer name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: `User with email "${normalizedEmail}" already exists` },
        { status: 409 }
      );
    }

    // Generate secure temporary password if none provided
    const tempPassword = customPassword && customPassword.trim().length >= 8
      ? customPassword.trim()
      : `Vanguard-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`;

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "DEVELOPER",
        avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    await recordAuditLog({
      userId: session.user.id,
      action: "MEMBER_INVITED",
      metadata: { developerId: newUser.id, developerEmail: newUser.email },
    });

    let emailSent = false;
    if (body.sendEmail) {
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

        const res = await sendDeveloperCredentialsEmail({
          developerEmail: newUser.email,
          developerName: newUser.name,
          temporaryPassword: tempPassword,
          loginUrl,
        });
        emailSent = res.success;
      } catch (e) {
        console.error("[AUTO_SEND_CREDENTIALS_FAILED]", e);
      }
    }

    return NextResponse.json(
      {
        developer: newUser,
        oneTimePassword: tempPassword,
        emailSent,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[TEAM_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create developer account", details: error.message },
      { status: 500 }
    );
  }
}
