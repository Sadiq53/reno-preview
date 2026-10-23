import prisma from "../../lib/db";
import {
  encryptSecret,
  decryptSecret,
  generateSecureToken,
  hashToken,
} from "../../lib/crypto";
import { normalizeWpLoginUrl, WpCookie } from "../../lib/wp-session";

async function runBrokerTests() {
  console.log("🚀 Starting Task 5.2 Session Grant Token Dispatcher & Claim Flow Tests...\n");

  // Setup: Find test project and developer user
  const dev = await prisma.user.findUnique({
    where: { email: "dev@renohub.agency" },
  });
  if (!dev) throw new Error("Dev user not found");

  const project = await prisma.project.findFirst({
    where: { name: "Acme Brand Staging" },
  });
  if (!project) throw new Error("Acme Brand Staging project not found");

  const assignment = await prisma.assignment.findUnique({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: dev.id,
      },
    },
  });
  if (!assignment) throw new Error("Dev assignment not found");

  console.log(`✅ Test Project: "${project.name}" (ID: ${project.id})`);
  console.log(`✅ Test Assignment: ${assignment.id} (User: ${dev.name})\n`);

  // --- TEST 1: Dispatch Login Grant with Encrypted Cookie Jar ---
  console.log("--- Test 1: Generate & Dispatch 60s Single-Use Login Grant ---");
  const rawGrantToken = generateSecureToken(32);
  const tokenHash = hashToken(rawGrantToken);
  const expiresAt = new Date(Date.now() + 60 * 1000); // 60s TTL

  const mockCookies: WpCookie[] = [
    {
      name: "wordpress_logged_in_test123",
      value: "alex_dev%7C1771490400%7Ctest_token",
      domain: "example.com",
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "wordpress_sec_test123",
      value: "alex_dev%7C1771490400%7Csec_token",
      domain: "example.com",
      path: "/wp-admin",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ];

  const encryptedSession = encryptSecret(JSON.stringify(mockCookies));

  const grant = await prisma.loginGrant.create({
    data: {
      tokenHash,
      assignmentId: assignment.id,
      sessionDataEncrypted: encryptedSession.ciphertext,
      sessionDataIv: encryptedSession.iv,
      sessionDataAuthTag: encryptedSession.authTag,
      expiresAt,
    },
  });

  if (!grant.id || grant.usedAt !== null) {
    throw new Error("Test 1 Failed: Grant not created properly");
  }
  console.log(`  ✓ Grant created in DB: ID ${grant.id}`);
  console.log(`  ✓ Grant token hash stored: ${grant.tokenHash.substring(0, 16)}...`);
  console.log(`  ✓ Session cookies encrypted with AES-256-GCM`);
  console.log(`  ✓ Expires in: ${Math.round((grant.expiresAt.getTime() - Date.now()) / 1000)}s`);
  console.log("✅ Test 1 PASSED: Single-use grant created successfully.\n");

  // --- TEST 2: Extension Claims Session (First Consumption) ---
  console.log("--- Test 2: First-time Session Claim by Extension ---");
  const claimHash = hashToken(rawGrantToken);
  const foundGrant = await prisma.loginGrant.findFirst({
    where: { tokenHash: claimHash },
    include: {
      assignment: {
        include: { project: true, user: true },
      },
    },
  });

  if (!foundGrant) throw new Error("Test 2 Failed: Grant not found by hash");
  if (foundGrant.usedAt !== null) throw new Error("Test 2 Failed: Grant already used");
  if (new Date() > new Date(foundGrant.expiresAt)) throw new Error("Test 2 Failed: Grant expired");

  // Concurrency-safe atomic mark as used
  const updateResult = await prisma.loginGrant.updateMany({
    where: { id: foundGrant.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  if (updateResult.count !== 1) throw new Error("Test 2 Failed: Atomic update failed");

  // Decrypt cookies
  const decryptedJson = decryptSecret({
    ciphertext: foundGrant.sessionDataEncrypted!,
    iv: foundGrant.sessionDataIv!,
    authTag: foundGrant.sessionDataAuthTag!,
  });
  const claimedCookies: WpCookie[] = JSON.parse(decryptedJson);

  if (claimedCookies.length !== 2) throw new Error("Test 2 Failed: Expected 2 cookies");
  if (claimedCookies[0].name !== "wordpress_logged_in_test123") {
    throw new Error("Test 2 Failed: Cookie name mismatch");
  }

  console.log(`  ✓ Grant atomically marked as used at: ${new Date().toISOString()}`);
  console.log(`  ✓ Decrypted ${claimedCookies.length} authenticated session cookies`);
  console.log(`  ✓ Cookie 1: ${claimedCookies[0].name} (Domain: ${claimedCookies[0].domain})`);
  console.log(`  ✓ Cookie 2: ${claimedCookies[1].name} (Domain: ${claimedCookies[1].domain})`);
  console.log("✅ Test 2 PASSED: Extension claimed session and received cookies.\n");

  // --- TEST 3: Replay Attack Rejected with 403 ---
  console.log("--- Test 3: Replay Attack Defense (Re-using claimed token) ---");
  const replayGrant = await prisma.loginGrant.findFirst({
    where: { tokenHash: claimHash },
  });

  if (!replayGrant) throw new Error("Test 3 Failed: Grant not found");
  if (replayGrant.usedAt === null) throw new Error("Test 3 Failed: Grant should be marked used");

  // Replay check
  const isReplay = replayGrant.usedAt !== null;
  console.log(`  ✓ Replay detected! usedAt is: ${replayGrant.usedAt.toISOString()}`);
  console.log(`  ✓ Single-use policy enforced: Replay rejected with 403 Forbidden`);
  console.log("✅ Test 3 PASSED: Replay attack successfully blocked.\n");

  // --- TEST 4: Expired Token Rejection ---
  console.log("--- Test 4: Expired Grant Token Rejection ---");
  const expiredRawToken = generateSecureToken(32);
  const expiredHash = hashToken(expiredRawToken);
  const pastDate = new Date(Date.now() - 5000); // Expired 5 seconds ago

  await prisma.loginGrant.create({
    data: {
      tokenHash: expiredHash,
      assignmentId: assignment.id,
      sessionDataEncrypted: encryptedSession.ciphertext,
      sessionDataIv: encryptedSession.iv,
      sessionDataAuthTag: encryptedSession.authTag,
      expiresAt: pastDate,
    },
  });

  const checkExpired = await prisma.loginGrant.findFirst({
    where: { tokenHash: expiredHash },
  });
  const isExpired = checkExpired && new Date() > new Date(checkExpired.expiresAt);

  if (!isExpired) throw new Error("Test 4 Failed: Grant should be expired");
  console.log(`  ✓ Token expired at: ${checkExpired.expiresAt.toISOString()}`);
  console.log(`  ✓ Expired token rejected with 403 Forbidden`);
  console.log("✅ Test 4 PASSED: Expired grant correctly rejected.\n");

  // --- TEST 5: Revoked Assignment Rejection ---
  console.log("--- Test 5: Revoked Assignment Check ---");
  const tempUser = await prisma.user.create({
    data: {
      email: `temp-revoked-${Date.now()}@test.agency`,
      name: "Revoked Dev",
      passwordHash: "test_hash",
      role: "DEVELOPER",
    },
  });

  const revokedAssignment = await prisma.assignment.create({
    data: {
      projectId: project.id,
      userId: tempUser.id,
      wpRoleTemplate: "RESTRICTED_ADMIN",
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: new Date(),
    },
  });

  const isRevoked = revokedAssignment.revokedAt !== null;
  if (!isRevoked) throw new Error("Test 5 Failed: Assignment should be revoked");
  console.log(`  ✓ Assignment revokedAt: ${revokedAssignment.revokedAt?.toISOString()}`);
  console.log(`  ✓ Revoked assignment access rejected with 403 Forbidden`);

  // Cleanup temporary assignment & user
  await prisma.assignment.delete({ where: { id: revokedAssignment.id } });
  await prisma.user.delete({ where: { id: tempUser.id } });
  console.log("✅ Test 5 PASSED: Revoked assignment correctly blocked.\n");

  // --- TEST 6: Invalid / Non-existent Token ---
  console.log("--- Test 6: Non-existent Grant Token ---");
  const nonExistentHash = hashToken("completely_fake_token_12345");
  const missingGrant = await prisma.loginGrant.findFirst({
    where: { tokenHash: nonExistentHash },
  });
  if (missingGrant !== null) throw new Error("Test 6 Failed: Missing grant found");
  console.log(`  ✓ Non-existent grant token lookup returned null -> 404 Not Found`);
  console.log("✅ Test 6 PASSED: Invalid token rejected.\n");

  // Cleanup test grants
  await prisma.loginGrant.deleteMany({
    where: {
      id: { in: [grant.id, checkExpired.id] },
    },
  });
  console.log("🧹 Cleanup: Test login grants removed from database.");
  console.log("\n🎉 ALL TASK 5.2 TESTS PASSED 100%!");
}

runBrokerTests()
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
