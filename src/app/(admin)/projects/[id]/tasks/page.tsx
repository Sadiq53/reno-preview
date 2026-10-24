import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProjectTasksRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "DEVELOPER") {
    redirect(`/developer/tasks?projectId=${id}`);
  }

  redirect(`/projects/${id}?tab=tasks`);
}
