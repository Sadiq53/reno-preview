"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TasksRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/admin/projects/${params.id}?tab=tasks`);
    }
  }, [params?.id, router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
      Redirecting to Project Task Board...
    </div>
  );
}
