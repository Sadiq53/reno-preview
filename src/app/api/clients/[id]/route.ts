import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                pages: true,
                assignments: true,
                comments: true,
                shareLinks: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error("[CLIENT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch client", details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = String(body.name).trim();
    if (body.email !== undefined) dataToUpdate.email = String(body.email).trim().toLowerCase();
    if (body.phone !== undefined) dataToUpdate.phone = body.phone ? String(body.phone).trim() : null;
    if (body.company !== undefined) dataToUpdate.company = body.company ? String(body.company).trim() : null;
    if (body.instagram !== undefined) dataToUpdate.instagram = body.instagram ? String(body.instagram).trim() : null;
    if (body.linkedin !== undefined) dataToUpdate.linkedin = body.linkedin ? String(body.linkedin).trim() : null;
    if (body.address !== undefined) dataToUpdate.address = body.address ? String(body.address).trim() : null;
    if (body.notes !== undefined) dataToUpdate.notes = body.notes ? String(body.notes).trim() : null;

    const updated = await prisma.client.update({
      where: { id },
      data: dataToUpdate,
    });

    // If name was updated, optionally keep project clientName in sync
    if (dataToUpdate.name) {
      await prisma.project.updateMany({
        where: { clientId: id },
        data: { clientName: dataToUpdate.name },
      });
    }

    await recordAuditLog({
      userId: session.user.id,
      action: "CLIENT_UPDATED",
      metadata: { clientId: id, updatedFields: Object.keys(dataToUpdate) },
    });

    return NextResponse.json({ client: updated });
  } catch (error: any) {
    console.error("[CLIENT_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update client", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { projects: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Unlink any projects so they don't break
    await prisma.project.updateMany({
      where: { clientId: id },
      data: { clientId: null },
    });

    await prisma.client.delete({
      where: { id },
    });

    await recordAuditLog({
      userId: session.user.id,
      action: "CLIENT_DELETED",
      metadata: { clientId: id, clientName: existing.name },
    });

    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (error: any) {
    console.error("[CLIENT_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete client", details: error.message },
      { status: 500 }
    );
  }
}
