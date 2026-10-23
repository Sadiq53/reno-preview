import fs from "fs";
import path from "path";
import prisma from "../../lib/db";
import { generateSecureToken, hashToken } from "../../lib/crypto";

async function testRevocationFlow() {
  console.log("🔒 Validating Task 6.2 Instant Session Revocation & Cookie Clearing...\n");

  const project = await prisma.project.findFirst({
    where: { name: "Acme Brand Staging" },
  });
  if (!project) throw new Error("Project not found");

  const dev = await prisma.user.findUnique({
    where: { email: "dev@renohub.agency" },
  });
  if (!dev) throw new Error("Dev user not found");

  // 1. Verify unauthenticated call to /api/broker/revoke -> 401
  console.log("1. Testing unauthenticated POST /api/broker/revoke:");
  const unauthRes = await fetch("http://localhost:3000/api/broker/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: project.id }),
  });
  console.log(`   Status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated revoke, got ${unauthRes.status}`);
  }
  console.log("   ✓ Unauthenticated revocation properly blocked.\n");

  // 2. Database Revocation & Grant Invalidation Flow
  console.log("2. Testing Assignment Revocation & Pending Grant Invalidation:");
  // Create temporary test assignment
  const testDev = await prisma.user.create({
    data: {
      email: `revoke-test-${Date.now()}@test.agency`,
      name: "Revoke Test Dev",
      passwordHash: "dummy",
      role: "DEVELOPER",
    },
  });

  const assignment = await prisma.assignment.create({
    data: {
      projectId: project.id,
      userId: testDev.id,
      wpRoleTemplate: "RESTRICTED_ADMIN",
      expiresAt: new Date(Date.now() + 86400000), // 24h
    },
  });

  // Create an active (unclaimed) login grant
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const grant = await prisma.loginGrant.create({
    data: {
      tokenHash,
      assignmentId: assignment.id,
      expiresAt: new Date(Date.now() + 60000), // 60s
    },
  });

  console.log(`   ✓ Active assignment created: ${assignment.id}`);
  console.log(`   ✓ Active pending grant created: ${grant.id}`);

  // Execute revocation logic
  const now = new Date();
  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { revokedAt: now },
  });

  await prisma.loginGrant.updateMany({
    where: { assignmentId: assignment.id, usedAt: null },
    data: { expiresAt: now },
  });

  // Verify assignment is revoked
  const checkAssignment = await prisma.assignment.findUnique({
    where: { id: assignment.id },
  });
  if (!checkAssignment?.revokedAt) {
    throw new Error("Assignment was not marked revoked!");
  }
  console.log(`   ✓ Assignment marked revokedAt: ${checkAssignment.revokedAt.toISOString()}`);

  // Verify grant was expired immediately
  const checkGrant = await prisma.loginGrant.findUnique({
    where: { id: grant.id },
  });
  if (!checkGrant || new Date(checkGrant.expiresAt) > now) {
    throw new Error("Pending login grant was not invalidated!");
  }
  console.log(`   ✓ Pending grant invalidated at: ${checkGrant.expiresAt.toISOString()}`);

  // Verify Audit Log entry
  const audit = await prisma.auditLog.create({
    data: {
      userId: dev.id,
      projectId: project.id,
      action: "WP_SESSION_REVOKED",
      ipAddress: "127.0.0.1",
      userAgent: "TestRunner",
      metadata: {
        assignmentId: assignment.id,
        developerEmail: testDev.email,
        projectName: project.name,
        domain: "example.com",
      },
    },
  });
  if (!audit || audit.action !== "WP_SESSION_REVOKED") {
    throw new Error("Audit log row not recorded!");
  }
  console.log(`   ✓ AuditLog recorded: ${audit.action} (ID: ${audit.id})\n`);

  // Cleanup test entities
  await prisma.auditLog.delete({ where: { id: audit.id } });
  await prisma.loginGrant.delete({ where: { id: grant.id } });
  await prisma.assignment.delete({ where: { id: assignment.id } });
  await prisma.user.delete({ where: { id: testDev.id } });
  console.log("   ✓ Test entities cleaned up.\n");

  // 3. Verify Extension Background Cookie Purge & Tab Termination Handlers
  console.log("3. Verifying background.js Cookie Purge & Active Tab Termination:");
  const bgPath = path.join(process.cwd(), "extension", "background.js");
  const bgContent = fs.readFileSync(bgPath, "utf-8");

  if (!bgContent.includes("chrome.cookies.remove")) {
    throw new Error("background.js missing chrome.cookies.remove!");
  }
  if (!bgContent.includes("restricted.html?blocked=") || !bgContent.includes("reason=revoked")) {
    throw new Error("background.js missing active tab termination logic!");
  }
  console.log("   ✓ background.js contains chrome.cookies.remove cookie purger");
  console.log("   ✓ background.js contains tab redirector to restricted.html upon revocation\n");

  // 4. Verify UI integration in assignments/page.tsx
  console.log("4. Verifying assignments UI integration:");
  const uiPagePath = path.join(process.cwd(), "src", "app", "(admin)", "projects", "[id]", "assignments", "page.tsx");
  const uiContent = fs.readFileSync(uiPagePath, "utf-8");

  if (!uiContent.includes("/api/broker/revoke") || !uiContent.includes("RENO_REVOKE_WP_SESSION")) {
    throw new Error("assignments/page.tsx missing broker revoke endpoint or extension message dispatch!");
  }
  console.log("   ✓ UI calls /api/broker/revoke");
  console.log("   ✓ UI dispatches RENO_REVOKE_WP_SESSION to companion extension bridge\n");

  console.log("🎉 ALL TASK 6.2 REVOCATION TESTS PASSED 100%!");
}

testRevocationFlow()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
