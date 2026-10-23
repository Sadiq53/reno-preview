import prisma from "../../../src/lib/db";

async function testSessionCheck() {
  console.log("🔍 Testing /api/broker/session-check API...");

  const project = await prisma.project.findFirst({ where: { name: "Acme Brand Staging" } });
  if (!project) throw new Error("Project not found");

  const tempDev = await prisma.user.create({
    data: {
      name: "Temp Dev Check",
      email: `temp_check_${Date.now()}@test.com`,
      role: "DEVELOPER",
      passwordHash: "dummy_hash_for_testing",
    },
  });

  // Create test assignment
  const assignment = await prisma.assignment.create({
    data: {
      projectId: project.id,
      userId: tempDev.id,
      wpRoleTemplate: "RESTRICTED_ADMIN",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });

  try {
    // 1. Check active assignment
    const res1 = await fetch(`http://localhost:3000/api/broker/session-check?assignmentId=${assignment.id}`);
    const data1 = await res1.json();
    console.log("1. Active assignment check:", data1);
    if (!data1.active) throw new Error("Expected active: true for new assignment");

    // 2. Mark revoked
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: { revokedAt: new Date() },
    });

    const res2 = await fetch(`http://localhost:3000/api/broker/session-check?assignmentId=${assignment.id}`);
    const data2 = await res2.json();
    console.log("2. Revoked assignment check:", data2);
    if (data2.active || data2.reason !== "revoked") throw new Error("Expected active: false, reason: revoked");

    console.log("✅ Session Check API verified 100%!");
  } finally {
    await prisma.assignment.delete({ where: { id: assignment.id } });
    await prisma.user.delete({ where: { id: tempDev.id } });
    await prisma.$disconnect();
  }
}

testSessionCheck().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
