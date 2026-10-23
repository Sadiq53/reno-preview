"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AssignmentsRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.id) {
      router.replace(`/admin/projects/${params.id}?tab=settings&sub=team`);
    }
  }, [params?.id, router]);

  // Revocation dispatcher for companion extension and broker API
  const handleRevokeAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch("/api/broker/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (res.ok) {
        window.postMessage({ type: "VANGUARD_REVOKE_WP_SESSION", assignmentId }, "*");
        window.postMessage({ type: "RENO_REVOKE_WP_SESSION", assignmentId }, "*");
      }
    } catch {}
  };

  return (
    <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
      Redirecting to Project Team Access Grants...
    </div>
  );
}

