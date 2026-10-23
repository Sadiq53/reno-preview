"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbsProps {
  customLabels?: Record<string, string>;
  projectName?: string;
}

export default function Breadcrumbs({ customLabels, projectName }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Split paths and ignore empty segments
  const segments = pathname.split("/").filter(Boolean);

  // If on admin root
  if (segments.length === 1 && segments[0] === "admin") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Home className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Command Hub</span>
      </div>
    );
  }

  // Build breadcrumbs array
  const crumbs: { href: string; label: string; isLast: boolean }[] = [];
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentPath += `/${seg}`;

    // Skip "(admin)" route group if it appears in pathname (Next.js usually omits it)
    if (seg === "(admin)") continue;

    let label = seg;

    if (seg === "admin") {
      label = "Hub";
    } else if (seg === "projects") {
      label = "Projects";
    } else if (seg === "new") {
      label = "New Project";
    } else if (seg === "team") {
      label = "Team & Contractors";
    } else if (seg === "audit") {
      label = "Audit Logs";
    } else if (seg === "profile") {
      label = "My Profile";
    } else if (seg === "tasks") {
      label = "Task Board";
    } else if (seg === "settings") {
      label = "Settings";
    } else if (seg === "pages") {
      label = "Pages";
    } else if (seg === "assignments") {
      label = "Team Access";
    } else if (customLabels && customLabels[seg]) {
      label = customLabels[seg];
    } else if (projectName && segments[i - 1] === "projects") {
      label = projectName;
    } else if (seg.length > 15) {
      // Looks like a cuid/uuid/project id
      label = projectName || "Project Details";
    } else {
      label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    }

    crumbs.push({
      href: currentPath,
      label,
      isLast: i === segments.length - 1,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.href + idx}>
          <ChevronRight className="h-3 w-3 text-border shrink-0" />
          {crumb.isLast ? (
            <span className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-[260px] font-display">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[140px] cursor-pointer"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
