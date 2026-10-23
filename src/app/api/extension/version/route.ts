import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * GET /api/extension/version
 * Returns the current published version and minimum required version of the Vanguard Companion Extension.
 * Queried by content-bridge.js and the Web Portal to alert users when their installed extension is outdated.
 */
export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), "extension", "manifest.json");
    const manifestRaw = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw);

    return NextResponse.json(
      {
        latestVersion: manifest.version || "1.0.0",
        minRequiredVersion: "1.0.0",
        downloadUrl: "/api/extension/download",
        extensionName: manifest.name || "Crewvia Vanguard Companion",
        description: manifest.description || "",
        releaseNotes:
          "Zero-Trust runtime sentinels, automated single-use session broker, upload RCE blockers, and tamper-resistant frame protections.",
        updatedAt: "2026-10-23T15:00:00Z",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("[EXTENSION_VERSION_ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to read extension version metadata" },
      { status: 500 }
    );
  }
}
