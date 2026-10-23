import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only ADMIN can list clients and client management
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() || "";

    const clientDelegate = (prisma as any).client;
    if (!clientDelegate) {
      return NextResponse.json({ clients: [] });
    }

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { projects: true },
        },
        projects: {
          select: {
            id: true,
            name: true,
            stage: true,
            category: true,
            status: true,
            targetUrl: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error("[CLIENTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch clients", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, company, instagram, linkedin, address, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const clientDelegate = (prisma as any).client;
    if (!clientDelegate) {
      return NextResponse.json(
        { error: "Database schema is reloading. Please refresh and try again." },
        { status: 503 }
      );
    }

    // Check for duplicate client email
    const existing = await clientDelegate.findFirst({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Client with email "${cleanEmail}" already exists` },
        { status: 409 }
      );
    }

    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`;

    const newClient = await clientDelegate.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        company: company ? String(company).trim() : null,
        instagram: instagram ? String(instagram).trim() : null,
        linkedin: linkedin ? String(linkedin).trim() : null,
        address: address ? String(address).trim() : null,
        notes: notes ? String(notes).trim() : null,
        avatarUrl,
      },
    });

    await recordAuditLog({
      userId: session.user.id,
      action: "CLIENT_CREATED",
      metadata: { clientId: newClient.id, clientName: newClient.name, clientEmail: newClient.email },
    });

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (error: any) {
    console.error("[CLIENTS_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to create client", details: error.message },
      { status: 500 }
    );
  }
}
