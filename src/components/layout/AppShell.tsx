"use client";

import React, { useState, useEffect } from "react";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

interface AppShellProps {
  children: React.ReactNode;
  projectName?: string;
}

export default function AppShell({ children, projectName }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crewvia_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("crewvia_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent selection:text-accent-foreground">
      {/* Adjustable Persistent Sidebar */}
      <AppSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-[68px]" : "lg:pl-64"
        }`}
      >
        {/* Global Standard Header */}
        <AppHeader
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          projectName={projectName}
        />

        {/* Page Content Container */}
        <main className="flex-1 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
