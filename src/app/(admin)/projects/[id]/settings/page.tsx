"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function SettingsRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      const sub = searchParams.get("sub");
      const subParam = sub ? `&sub=${sub}` : "";
      router.replace(`/admin/projects/${params.id}?tab=settings${subParam}`);
    }
  }, [params?.id, router, searchParams]);

  return (
    <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
      Redirecting to Project Settings...
    </div>
  );
}
