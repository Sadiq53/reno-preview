import { PrismaClient, Role, ProjectStatus, CommentStatus, ShareAccessLevel, WpRoleTemplate } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Reno Hub database seeding...");

  // 1. Create Agency Admin
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@renohub.agency" },
    update: {},
    create: {
      email: "admin@renohub.agency",
      name: "Agency Owner",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AdminOwner",
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // 2. Create Developer
  const devPasswordHash = await bcrypt.hash("DevPassword123!", 10);
  const dev = await prisma.user.upsert({
    where: { email: "dev@renohub.agency" },
    update: {},
    create: {
      email: "dev@renohub.agency",
      name: "Alex Developer",
      passwordHash: devPasswordHash,
      role: Role.DEVELOPER,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexDev",
    },
  });
  console.log(`✅ Developer created: ${dev.email}`);

  // 3. Create Demo Project
  const sampleSecret = crypto.randomBytes(32).toString("hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.alloc(32, 1), iv);
  let encrypted = cipher.update(sampleSecret, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  const project = await prisma.project.create({
    data: {
      name: "Acme Brand Staging",
      clientName: "Acme Corporation",
      targetUrl: "https://example.com",
      wpSecretEncrypted: encrypted,
      wpSecretIv: iv.toString("hex"),
      wpSecretAuthTag: authTag,
      status: ProjectStatus.ACTIVE,
      pages: {
        create: [
          {
            path: "/",
            fullUrl: "https://example.com/",
            title: "Home",
            isDefault: true,
            displayOrder: 1,
          },
          {
            path: "/shop",
            fullUrl: "https://example.com/shop",
            title: "Product Catalog",
            isDefault: false,
            displayOrder: 2,
          },
          {
            path: "/checkout",
            fullUrl: "https://example.com/checkout",
            title: "Checkout",
            isDefault: false,
            displayOrder: 3,
          },
        ],
      },
    },
    include: {
      pages: true,
    },
  });
  console.log(`✅ Demo project created: ${project.name}`);

  // 4. Assign Developer to Project (30-day expiry)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const assignment = await prisma.assignment.create({
    data: {
      projectId: project.id,
      userId: dev.id,
      wpRoleTemplate: WpRoleTemplate.RESTRICTED_ADMIN,
      expiresAt: expiresAt,
    },
  });
  console.log(`✅ Developer assigned to project with 30-day expiry: ${assignment.id}`);

  // 5. Create Sample Pinpoint Annotations
  const homePage = project.pages.find((p) => p.path === "/") || project.pages[0];

  await prisma.comment.createMany({
    data: [
      {
        projectId: project.id,
        pageId: homePage.id,
        authorUserId: admin.id,
        content: "Hero CTA button text needs to be 18px and centered on mobile viewports.",
        posX: 50.0,
        posY: 25.5,
        viewportWidth: 375,
        viewportHeight: 667,
        scrollY: 0,
        status: CommentStatus.PENDING,
      },
      {
        projectId: project.id,
        pageId: homePage.id,
        authorUserId: dev.id,
        content: "Fixed desktop navbar z-index so dropdown appears over preview hero banner.",
        posX: 18.2,
        posY: 4.8,
        viewportWidth: 1440,
        viewportHeight: 900,
        scrollY: 0,
        status: CommentStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedByUserId: dev.id,
      },
    ],
  });
  console.log("✅ Sample pinpoint comments created");

  // 6. Create Client Shareable Link
  const shareToken = crypto.randomBytes(24).toString("base64url");
  const shareLink = await prisma.shareLink.create({
    data: {
      projectId: project.id,
      token: shareToken,
      accessLevel: ShareAccessLevel.COMMENTER,
      expiresAt: expiresAt,
    },
  });
  console.log(`✅ Client share link created: /share/${shareLink.token}`);

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
