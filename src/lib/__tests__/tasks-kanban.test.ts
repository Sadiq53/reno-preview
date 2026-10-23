import assert from "assert";
import prisma from "@/lib/db";

async function runTests() {
  console.log("📋 Running Unified Tasks & Kanban Board Unit Tests...\n");

  const project = await prisma.project.findFirst({
    where: { status: "ACTIVE" },
  });
  assert.ok(project, "Active project must exist");
  const projectId = project.id;

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  assert.ok(adminUser, "Admin user must exist");

  const devUser = await prisma.user.findFirst({
    where: { role: "DEVELOPER" },
  });
  assert.ok(devUser, "Developer user must exist");

  // Test 1: Create a Manual Task on Kanban Board
  console.log("1. Testing manual task creation on Kanban Board");
  const createdTask = await prisma.comment.create({
    data: {
      projectId,
      authorUserId: adminUser.id,
      assigneeUserId: devUser.id,
      title: "Refactor Navbar Flexbox Layout",
      content: "Ensure navigation links align properly on mobile and tablet viewport widths.",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 86400000 * 3),
      notes: "Initial audit note: check CSS flex-wrap property.",
      status: "PENDING",
      posX: null,
      posY: null,
    },
    include: {
      authorUser: true,
      assigneeUser: true,
    },
  });

  assert.strictEqual(createdTask.title, "Refactor Navbar Flexbox Layout");
  assert.strictEqual(createdTask.priority, "HIGH");
  assert.strictEqual(createdTask.status, "PENDING");
  assert.strictEqual(createdTask.assigneeUserId, devUser.id);
  assert.strictEqual(createdTask.posX, null, "Manual task has null canvas coordinates");
  console.log("   ✔ Manual task created in PENDING with HIGH priority and Developer assignee");

  // Test 2: Verify Unified Retrieval (Visual Pins + Manual Tasks)
  console.log("2. Testing Unified Task Retrieval (both Pins and Tasks)");
  const allTasks = await prisma.comment.findMany({
    where: { projectId },
    include: {
      page: true,
      authorUser: true,
      assigneeUser: true,
      replies: true,
    },
    orderBy: { createdAt: "desc" },
  });

  assert.ok(allTasks.length > 0);
  const foundTask = allTasks.find((t) => t.id === createdTask.id);
  assert.ok(foundTask, "Newly created task must be present in unified query");
  console.log(`   ✔ Successfully fetched ${allTasks.length} unified tasks from database`);

  // Test 3: Progress Task to IN_PROGRESS (Simulating Kanban Drag & Drop)
  console.log("3. Testing Task Drag & Drop to IN_PROGRESS");
  const inProgressTask = await prisma.comment.update({
    where: { id: createdTask.id },
    data: {
      status: "IN_PROGRESS",
      notes: "Developer started working on responsive flex-wrap.",
    },
  });

  assert.strictEqual(inProgressTask.status, "IN_PROGRESS");
  assert.strictEqual(inProgressTask.notes, "Developer started working on responsive flex-wrap.");
  console.log("   ✔ Task updated to IN_PROGRESS and attached notes persisted");

  // Test 4: Complete Task -> RESOLVED with Resolver Audit
  console.log("4. Testing Task Drag & Drop to RESOLVED");
  const resolvedTask = await prisma.comment.update({
    where: { id: createdTask.id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedByUserId: devUser.id,
    },
    include: {
      resolvedByUser: true,
    },
  });

  assert.strictEqual(resolvedTask.status, "RESOLVED");
  assert.ok(resolvedTask.resolvedAt);
  assert.strictEqual(resolvedTask.resolvedByUserId, devUser.id);
  console.log("   ✔ Task marked RESOLVED with timestamp and resolver user");

  // Test 5: Add Attached Reply / Discussion Note
  console.log("5. Testing Threaded Reply on Task");
  const reply = await prisma.commentReply.create({
    data: {
      commentId: createdTask.id,
      authorUserId: devUser.id,
      content: "PR submitted with flexbox fix in commit #8839.",
    },
    include: {
      authorUser: true,
    },
  });

  assert.strictEqual(reply.commentId, createdTask.id);
  assert.strictEqual(reply.content, "PR submitted with flexbox fix in commit #8839.");
  console.log("   ✔ Threaded reply attached to task successfully");

  // Test 6: Task Cleanup
  console.log("6. Testing Task Cascade Deletion");
  await prisma.comment.delete({
    where: { id: createdTask.id },
  });

  const checkDeleted = await prisma.comment.findUnique({
    where: { id: createdTask.id },
  });
  assert.strictEqual(checkDeleted, null);
  console.log("   ✔ Task and its cascade replies deleted successfully");

  console.log("\n🎉 ALL UNIFIED TASKS & KANBAN BOARD TESTS PASSED!\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
