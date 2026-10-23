import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string; pageId: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id, pageId } = await params;
    const body = await req.json();
    const { title, isHidden } = body;

    const dataToUpdate: any = {};
    if (typeof title === "string" && title.trim().length > 0) {
      dataToUpdate.title = title.trim();
    }
    if (typeof isHidden === "boolean") {
      dataToUpdate.isHidden = isHidden;
    }

    const updated = await prisma.projectPage.update({
      where: { id: pageId, projectId: id },
      data: dataToUpdate,
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "PAGE_UPDATED",
      metadata: { pageId, updates: dataToUpdate },
    });

    return NextResponse.json({ page: updated });
  } catch (error: any) {
    console.error("[PAGE_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update page", details: error.message },
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

    const { id, pageId } = await params;

    const page = await prisma.projectPage.findUnique({
      where: { id: pageId, projectId: id },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Safety guard: Never delete root default page
    if (page.isDefault || page.path === "/") {
      return NextResponse.json(
        { error: "Cannot delete the default root home page of a project" },
        { status: 400 }
      );
    }

    await prisma.projectPage.delete({
      where: { id: pageId },
    });

    await recordAuditLog({
      userId: session.user.id,
      projectId: id,
      action: "PAGE_DELETED",
      metadata: { path: page.path, title: page.title },
    });

    return NextResponse.json({ success: true, deletedPageId: pageId });
  } catch (error: any) {
    console.error("[PAGE_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to delete page", details: error.message },
      { status: 500 }
    );
  }
}
