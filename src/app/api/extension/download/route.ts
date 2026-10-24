import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";

/**
 * GET /api/extension/download
 * Dynamically packages the latest Companion Extension directory into a clean, ready-to-install .zip bundle.
 * Enables zero-friction developer onboarding: 1-click download directly from the web portal.
 */
export async function GET() {
  try {
    const extensionDir = path.join(process.cwd(), "extension");
    const manifestPath = path.join(extensionDir, "manifest.json");

    let version = "1.0.0";
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        if (manifest.version) version = manifest.version;
      } catch (err) {
        // Fallback to default version
      }
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });

    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", (err: any) => reject(err));
    });

    // Package extension directory, filtering out cache and metadata folders
    archive.glob("**/*", {
      cwd: extensionDir,
      ignore: ["_metadata/**", "**/.DS_Store", "**/Thumbs.db", "*.log", "**/scratch/**"],
    });

    await archive.finalize();
    const zipBuffer = await archivePromise;

    const filename = `crewvia-vanguard-companion-v${version}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("[EXTENSION_DOWNLOAD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to package extension bundle.", details: error.message },
      { status: 500 }
    );
  }
}
