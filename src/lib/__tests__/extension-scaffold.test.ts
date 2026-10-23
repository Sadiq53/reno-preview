import fs from "fs";
import path from "path";
import prisma from "@/lib/db";
import { generateSecureToken, hashToken, encryptSecret } from "@/lib/crypto";

async function testExtensionScaffold() {
  console.log("🧩 Validating Task 5.3 Reno Access Companion Browser Extension Scaffold...\n");

  const extDir = path.join(process.cwd(), "extension");

  // 1. Validate Manifest V3
  console.log("1. Validating manifest.json:");
  const manifestPath = path.join(extDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("manifest.json missing!");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (manifest.manifest_version !== 3) {
    throw new Error(`Expected manifest_version 3, got ${manifest.manifest_version}`);
  }
  if (!manifest.permissions.includes("cookies") || !manifest.permissions.includes("storage")) {
    throw new Error("Manifest missing required permissions: cookies or storage");
  }
  if (!manifest.host_permissions.includes("<all_urls>")) {
    throw new Error("Manifest missing <all_urls> host permissions");
  }
  console.log(`   ✓ Name: "${manifest.name}" v${manifest.version}`);
  console.log(`   ✓ Manifest Version: ${manifest.manifest_version}`);
  console.log(`   ✓ Permissions: ${manifest.permissions.join(", ")}`);
  console.log(`   ✓ Host Permissions: ${manifest.host_permissions.join(", ")}\n`);

  // 2. Validate Background Service Worker
  console.log("2. Validating background.js:");
  const bgPath = path.join(extDir, manifest.background.service_worker);
  if (!fs.existsSync(bgPath)) {
    throw new Error(`Background script not found: ${bgPath}`);
  }
  const bgContent = fs.readFileSync(bgPath, "utf-8");
  if (!bgContent.includes("CLAIM_AND_LAUNCH_SESSION") || !bgContent.includes("chrome.cookies.set")) {
    throw new Error("background.js missing core session claim or cookie injection handlers!");
  }
  console.log(`   ✓ Service Worker file verified (${bgContent.length} bytes)`);
  console.log(`   ✓ Contains CLAIM_AND_LAUNCH_SESSION and chrome.cookies.set\n`);

  // 3. Validate Content Bridge Script
  console.log("3. Validating content-bridge.js:");
  const bridgePath = path.join(extDir, "content-bridge.js");
  if (!fs.existsSync(bridgePath)) {
    throw new Error(`content-bridge.js missing: ${bridgePath}`);
  }
  const bridgeContent = fs.readFileSync(bridgePath, "utf-8");
  if (!bridgeContent.includes("RENO_LAUNCH_WP_SESSION") || !bridgeContent.includes("data-reno-extension-installed")) {
    throw new Error("content-bridge.js missing portal bridge listeners or DOM sentinel attribute!");
  }
  console.log(`   ✓ Content Bridge verified (${bridgeContent.length} bytes)`);
  console.log(`   ✓ Sets data-reno-extension-installed and listens for RENO_LAUNCH_WP_SESSION\n`);

  // 4. Validate Popup Interface
  console.log("4. Validating popup interface files:");
  const popupHtmlPath = path.join(extDir, "popup", "popup.html");
  const popupCssPath = path.join(extDir, "popup", "popup.css");
  const popupJsPath = path.join(extDir, "popup", "popup.js");

  [popupHtmlPath, popupCssPath, popupJsPath].forEach((file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`Popup file missing: ${file}`);
    }
  });
  console.log(`   ✓ popup.html verified (${fs.statSync(popupHtmlPath).size} bytes)`);
  console.log(`   ✓ popup.css verified (${fs.statSync(popupCssPath).size} bytes)`);
  console.log(`   ✓ popup.js verified (${fs.statSync(popupJsPath).size} bytes)\n`);

  // 5. Validate Icons
  console.log("5. Validating extension icons:");
  [16, 48, 128].forEach((size) => {
    const iconPath = path.join(extDir, "icons", `icon${size}.png`);
    if (!fs.existsSync(iconPath)) {
      throw new Error(`Icon missing: ${iconPath}`);
    }
    const stat = fs.statSync(iconPath);
    if (stat.size === 0) throw new Error(`Icon is 0 bytes: ${iconPath}`);
    console.log(`   ✓ icon${size}.png valid (${stat.size} bytes)`);
  });
  console.log("");

  // 6. End-to-End Simulation of Extension Background Claim Flow
  console.log("6. Testing simulated background service worker claim flow against local broker API:");
  const project = await prisma.project.findFirst({ where: { name: "Acme Brand Staging" } });
  const assignment = await prisma.assignment.findFirst({ where: { projectId: project!.id } });

  const rawGrantToken = generateSecureToken(32);
  const tokenHash = hashToken(rawGrantToken);
  const expiresAt = new Date(Date.now() + 60 * 1000);

  const testCookies = [
    {
      name: "wordpress_logged_in_companion_test",
      value: "alex_dev%7Ctest_token_123",
      domain: "example.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax" as const,
    },
    {
      name: "wordpress_sec_companion_test",
      value: "alex_dev%7Ctest_sec_123",
      domain: "example.com",
      path: "/wp-admin",
      httpOnly: true,
      secure: true,
      sameSite: "Lax" as const,
    },
  ];

  const encrypted = encryptSecret(JSON.stringify(testCookies));

  const grant = await prisma.loginGrant.create({
    data: {
      tokenHash,
      assignmentId: assignment!.id,
      sessionDataEncrypted: encrypted.ciphertext,
      sessionDataIv: encrypted.iv,
      sessionDataAuthTag: encrypted.authTag,
      expiresAt,
    },
  });

  // Simulated extension fetch
  const response = await fetch("http://localhost:3000/api/broker/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-grant-token": rawGrantToken,
    },
    body: JSON.stringify({ grantToken: rawGrantToken }),
  });

  if (!response.ok) {
    throw new Error(`Extension claim failed with status ${response.status}`);
  }

  const claimResult = await response.json();
  if (!claimResult.success || claimResult.cookies.length !== 2) {
    throw new Error("Extension claim returned unexpected data!");
  }

  console.log(`   ✓ Extension successfully claimed ${claimResult.cookies.length} session cookies`);
  console.log(`   ✓ Target Admin URL: ${claimResult.wpAdminUrl}`);
  console.log(`   ✓ Domain: ${claimResult.domain}`);

  // Cleanup grant
  await prisma.loginGrant.delete({ where: { id: grant.id } });

  console.log("\n🎉 ALL TASK 5.3 EXTENSION TESTS PASSED 100%!");
}

testExtensionScaffold()
  .catch((err) => {
    console.error("❌ Extension test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
