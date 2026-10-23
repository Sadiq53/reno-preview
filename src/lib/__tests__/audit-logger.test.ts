import prisma from "../../lib/db";
import { recordAuditLog, queryAuditLogs, extractRequestMeta } from "../../lib/audit";

async function testAuditLogger() {
  console.log("📜 Validating Task 6.3 Centralized Audit Logger...\n");

  const project = await prisma.project.findFirst({
    where: { name: "Acme Brand Staging" },
  });
  if (!project) throw new Error("Project not found");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@renohub.agency" },
  });
  if (!admin) throw new Error("Admin user not found");

  // 1. Test Request Meta Extraction
  console.log("1. Testing extractRequestMeta:");
  const mockReq = new Request("http://localhost:3000/api/test", {
    headers: {
      "x-forwarded-for": "198.51.100.42, 10.0.0.1",
      "user-agent": "Mozilla/5.0 Chrome/122.0 RenoTest",
    },
  });
  const meta = extractRequestMeta(mockReq);
  console.log(`   ✓ Extracted IP: ${meta.ipAddress} (Expected: 198.51.100.42)`);
  console.log(`   ✓ Extracted User-Agent: ${meta.userAgent}`);
  if (meta.ipAddress !== "198.51.100.42") {
    throw new Error(`Expected IP 198.51.100.42, got ${meta.ipAddress}`);
  }
  console.log("   ✓ Meta extraction passed.\n");

  // 2. Test recordAuditLog
  console.log("2. Testing recordAuditLog creation:");
  const testAction = "WP_LOGIN_GRANT_DISPATCHED";
  const recorded = await recordAuditLog({
    userId: admin.id,
    projectId: project.id,
    action: testAction,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: {
      testRun: true,
      grantId: "test-grant-uuid-123",
      timestamp: new Date().toISOString(),
    },
  });

  if (!recorded || !recorded.id) {
    throw new Error("Failed to record audit log!");
  }
  console.log(`   ✓ AuditLog row created: ID ${recorded.id}`);
  console.log(`   ✓ Action: ${recorded.action}`);
  console.log(`   ✓ User ID: ${recorded.userId}`);
  console.log(`   ✓ Project ID: ${recorded.projectId}`);
  console.log(`   ✓ IP: ${recorded.ipAddress}`);
  console.log("   ✓ Record creation passed.\n");

  // 3. Test queryAuditLogs with Filters
  console.log("3. Testing queryAuditLogs filtering and pagination:");
  
  // Filter by action
  const actionResults = await queryAuditLogs({
    action: testAction,
    limit: 10,
  });
  console.log(`   ✓ Filter by action "${testAction}": found ${actionResults.total} events`);
  if (actionResults.logs.length === 0) {
    throw new Error("Query by action returned 0 results!");
  }

  // Filter by projectId
  const projectResults = await queryAuditLogs({
    projectId: project.id,
    limit: 5,
  });
  console.log(`   ✓ Filter by projectId: found ${projectResults.total} events`);
  if (projectResults.logs.length === 0) {
    throw new Error("Query by projectId returned 0 results!");
  }

  // Search filter
  const searchResults = await queryAuditLogs({
    search: "Acme",
    limit: 5,
  });
  console.log(`   ✓ Search by query "Acme": found ${searchResults.total} events`);

  // Pagination check
  const paged = await queryAuditLogs({
    limit: 2,
    offset: 0,
  });
  console.log(`   ✓ Pagination: requested 2, received ${paged.logs.length} (total: ${paged.total})\n`);

  // 4. Test HTTP Endpoint Security
  console.log("4. Testing GET /api/admin/audit HTTP endpoint:");
  const unauthRes = await fetch("http://localhost:3000/api/admin/audit");
  console.log(`   Status: ${unauthRes.status} (Expected: 401 or 403)`);
  if (unauthRes.status !== 401 && unauthRes.status !== 403) {
    throw new Error(`Expected 401/403 for unauthenticated audit API, got ${unauthRes.status}`);
  }
  console.log("   ✓ Unauthenticated access properly rejected.\n");

  // Cleanup test row
  await prisma.auditLog.delete({ where: { id: recorded.id } });
  console.log("   ✓ Test audit log row cleaned up.");

  console.log("\n🎉 ALL TASK 6.3 AUDIT LOGGER TESTS PASSED 100%!");
}

testAuditLogger()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
