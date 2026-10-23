import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";

import prisma from "@/lib/db";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ALLOWED_FOLDERS = new Set(["task-attachments", "avatars", "screenshots"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * POST /api/upload
 * Securely uploads images and documents to Firebase Storage (with local fallback).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await req.formData();
    const shareToken = req.headers.get("x-share-token") || (formData.get("shareToken") as string | null);

    // Strict Authorization Guard: Logged in user OR valid Commenter share link
    if (!session?.user) {
      if (!shareToken) {
        return NextResponse.json(
          { error: "Authentication or valid preview share link required to upload attachments.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      const shareLink = await prisma.shareLink.findUnique({
        where: { token: shareToken },
      });

      if (!shareLink || shareLink.isRevoked || (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date())) {
        return NextResponse.json(
          { error: "Preview share link is invalid or expired.", code: "INVALID_SHARE_LINK" },
          { status: 403 }
        );
      }

      if (shareLink.accessLevel !== "COMMENTER") {
        return NextResponse.json(
          { error: "Read-only preview link. Cannot upload task attachments.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }
    }

    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "task-attachments";
    // Path traversal defense: Whitelist allowed directory names
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "task-attachments";

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 25MB limit" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported. Allowed: Images, PDFs, and Documents.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await saveUploadedFile({
      buffer,
      originalFilename: file.name,
      mimeType: file.type,
      folder,
    });

    return NextResponse.json({
      success: true,
      file: result,
      uploaderId: session?.user?.id || null,
    });
  } catch (error: any) {
    console.error("[UPLOAD_API_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}
