import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Website Preview | Crewvia Vanguard",
  description: "Live interactive responsive website preview and visual annotations.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SharePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent selection:text-accent-foreground">
      {children}
    </div>
  );
}
