"use client";

import React, { useEffect } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";

function SessionSentinel() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && (session as any)?.error) {
      const error = (session as any).error;
      if (error === "ACCOUNT_DELETED") {
        signOut({ callbackUrl: "/login?error=ACCOUNT_DELETED" });
      } else if (error === "ACCOUNT_SUSPENDED") {
        signOut({ callbackUrl: "/login?error=ACCOUNT_SUSPENDED" });
      }
    }
  }, [session, status]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSentinel />
      {children}
    </SessionProvider>
  );
}

