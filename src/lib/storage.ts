/**
 * Unified File & Image Storage Utility
 * Supports Firebase Storage (primary) with local static fallback for screenshots and attachments.
 */

import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { uploadToFirebaseStorage } from "@/lib/firebase-admin";

export interface StoredFileResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  storageProvider: "firebase" | "local";
}

/**
 * Saves an uploaded buffer to Firebase Storage or local uploads directory.
 */
export async function saveUploadedFile(params: {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  folder?: string;
}): Promise<StoredFileResult> {
  const { buffer, originalFilename, mimeType, folder = "attachments" } = params;

  // Sanitize folder to prevent any path traversal
  const safeFolder = path.basename(folder).replace(/[^a-zA-Z0-9_-]/g, "") || "attachments";

  // Sanitize extension and create unique filename
  const ext = path.extname(originalFilename).toLowerCase() || ".png";
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  const safeBaseName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
  const storedFilename = `${safeBaseName}_${timestamp}_${uniqueId}${ext}`;
  const destinationPath = `${safeFolder}/${storedFilename}`;

  // 1. Attempt upload to Firebase Storage
  const firebaseUrl = await uploadToFirebaseStorage({
    buffer,
    destinationPath,
    contentType: mimeType,
  });

  if (firebaseUrl) {
    return {
      url: firebaseUrl,
      filename: storedFilename,
      size: buffer.length,
      mimeType,
      storageProvider: "firebase",
    };
  }

  // 2. Fallback: Save to local public/uploads directory
  const uploadsDir = path.join(process.cwd(), "public", "uploads", safeFolder);
  await fs.mkdir(uploadsDir, { recursive: true });
  const localFilePath = path.join(uploadsDir, storedFilename);
  await fs.writeFile(localFilePath, buffer);

  const localPublicUrl = `/uploads/${safeFolder}/${storedFilename}`;
  return {
    url: localPublicUrl,
    filename: storedFilename,
    size: buffer.length,
    mimeType,
    storageProvider: "local",
  };
}
