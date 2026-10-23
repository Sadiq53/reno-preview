import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findFirst();
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const dev = await prisma.user.findFirst({ where: { role: "DEVELOPER" } });

  if (!project || !dev || !admin) {
    console.error("Missing project, admin, or dev in database");
    return;
  }

  // Clear existing notifications to start fresh
  await prisma.notification.deleteMany({});

  await prisma.notification.createMany({
    data: [
      {
        userId: dev.id,
        projectId: project.id,
        type: "COMMENT_CREATED",
        title: "New Task Pinpoint Annotation",
        message: "Owner posted a new annotation task on Mobile Viewport (375×667): Verify checkout button tap area.",
        link: `/developer/tasks?project=${project.id}`,
        isRead: false,
      },
      {
        userId: dev.id,
        projectId: project.id,
        type: "QUERY_REPLIED",
        title: "Reply to Technical Query",
        message: "Owner replied: 'Yes, please make the navbar sticky with z-index 50 on mobile viewports.'",
        link: `/developer/tasks?project=${project.id}`,
        isRead: false,
      },
      {
        userId: dev.id,
        projectId: project.id,
        type: "PRIORITY_URGENT",
        title: "Urgent Task Flagged",
        message: "Urgent priority: Client reported modal close button is unclickable on iPad tablet viewport.",
        link: `/developer/tasks?project=${project.id}`,
        isRead: false,
      },
      {
        userId: dev.id,
        projectId: project.id,
        type: "TASK_RESOLVED",
        title: "Task Completed",
        message: "Alex Developer completed task: 'Updated CSS media query and flex alignment for mobile hero CTA button.'",
        link: `/developer/tasks?project=${project.id}`,
        isRead: true,
      },
      {
        userId: admin.id,
        projectId: project.id,
        type: "TASK_STARTED",
        title: "Developer Started Working on Task",
        message: "Alex Developer moved 'Hero CTA button alignment' to In Progress.",
        link: `/preview/${project.id}`,
        isRead: false,
      },
      {
        userId: admin.id,
        projectId: project.id,
        type: "TASK_RESOLVED",
        title: "Developer Completed Task",
        message: "Alex Developer marked 'Fixed desktop navbar z-index so dropdown appears over preview hero banner' as RESOLVED.",
        link: `/preview/${project.id}`,
        isRead: false,
      },
      {
        userId: admin.id,
        projectId: project.id,
        type: "COMMENT_CREATED",
        title: "Client Added Pinpoint Feedback",
        message: "Client posted comment on desktop viewport: 'Please update brand typography font-weight.'",
        link: `/preview/${project.id}`,
        isRead: false,
      },
    ],
  });

  console.log("Successfully created test notifications for Developer and Admin!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
