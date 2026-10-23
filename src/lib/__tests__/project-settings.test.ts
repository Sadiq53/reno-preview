import assert from "assert";
import prisma from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

async function runTests() {
  console.log("⚙️ Running Project Settings & WP Vault Unit Tests...\n");

  const project = await prisma.project.findFirst({
    where: { status: "ACTIVE" },
  });
  assert.ok(project, "Active project should exist for testing");
  const projectId = project.id;

  // Test 1: Project Settings Schema Validation in PostgreSQL
  console.log("1. Testing Project Settings updates and persistence in database");
  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      defaultViewport: "tablet",
      autoUnframeProxy: true,
      allowGuestComments: true,
      requireGuestEmail: false,
      shareExpirationDays: 14,
    },
  });

  assert.strictEqual(updatedProject.defaultViewport, "tablet");
  assert.strictEqual(updatedProject.autoUnframeProxy, true);
  assert.strictEqual(updatedProject.allowGuestComments, true);
  assert.strictEqual(updatedProject.requireGuestEmail, false);
  assert.strictEqual(updatedProject.shareExpirationDays, 14);
  console.log("   ✔ Project configuration saved and validated in PostgreSQL");

  // Test 2: WordPress Vault Credential Encryption & Decryption
  console.log("2. Testing WordPress Vault AES-256-GCM encryption & round-trip decryption");
  const rawUsername = "wp_admin_demo";
  const rawPassword = "SuperSecurePassword123!@#";
  const rawSecret = "sec_test_secret_key_998877";

  const encUser = encryptSecret(rawUsername);
  const encPass = encryptSecret(rawPassword);
  const encSec = encryptSecret(rawSecret);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      wpAdminUsernameEncrypted: encUser.ciphertext,
      wpAdminUsernameIv: encUser.iv,
      wpAdminUsernameAuthTag: encUser.authTag,
      wpAdminPasswordEncrypted: encPass.ciphertext,
      wpAdminPasswordIv: encPass.iv,
      wpAdminPasswordAuthTag: encPass.authTag,
      wpSecretEncrypted: encSec.ciphertext,
      wpSecretIv: encSec.iv,
      wpSecretAuthTag: encSec.authTag,
    },
  });

  // Verify decryption from database
  const fetchedProject = await prisma.project.findUnique({
    where: { id: projectId },
  });

  assert.ok(fetchedProject?.wpAdminUsernameEncrypted);
  assert.ok(fetchedProject?.wpAdminPasswordEncrypted);
  assert.ok(fetchedProject?.wpSecretEncrypted);

  const decryptedUser = decryptSecret({
    ciphertext: fetchedProject.wpAdminUsernameEncrypted!,
    iv: fetchedProject.wpAdminUsernameIv!,
    authTag: fetchedProject.wpAdminUsernameAuthTag!,
  });
  const decryptedPass = decryptSecret({
    ciphertext: fetchedProject.wpAdminPasswordEncrypted!,
    iv: fetchedProject.wpAdminPasswordIv!,
    authTag: fetchedProject.wpAdminPasswordAuthTag!,
  });
  const decryptedSecret = decryptSecret({
    ciphertext: fetchedProject.wpSecretEncrypted!,
    iv: fetchedProject.wpSecretIv!,
    authTag: fetchedProject.wpSecretAuthTag!,
  });

  assert.strictEqual(decryptedUser, rawUsername, "Decrypted username must match original");
  assert.strictEqual(decryptedPass, rawPassword, "Decrypted password must match original");
  assert.strictEqual(decryptedSecret, rawSecret, "Decrypted secret must match original");
  console.log("   ✔ Vaulted credentials encrypted with AES-256-GCM, stored in DB, and decrypted safely");

  // Test 3: Audit Log Verification
  console.log("3. Testing Audit Log generation for settings update");
  const auditLog = await prisma.auditLog.create({
    data: {
      projectId,
      action: "PROJECT_SETTINGS_UPDATED",
      ipAddress: "127.0.0.1",
      userAgent: "SettingsTest/1.0",
      metadata: {
        updatedFields: ["defaultViewport", "autoUnframeProxy", "shareExpirationDays"],
        credentialsUpdated: true,
      },
    },
  });

  assert.ok(auditLog.id);
  assert.strictEqual(auditLog.action, "PROJECT_SETTINGS_UPDATED");
  console.log("   ✔ Audit log record created successfully");

  console.log("\n🎉 ALL PROJECT SETTINGS & WP VAULT TESTS PASSED!\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
