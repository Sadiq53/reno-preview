import { redirect } from "next/navigation";

export default async function ProjectTasksRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/developer/tasks?projectId=${id}`);
}
