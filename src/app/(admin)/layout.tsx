import React from "react";
import AppShell from "@/components/layout/AppShell";

export const metadata = {
  title: "Admin Command Hub | Crewvia Vanguard",
  description: "Executive agency project management, visual annotator, and zero-trust access broker.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
