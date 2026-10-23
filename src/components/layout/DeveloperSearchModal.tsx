"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  FolderKanban,
  Eye,
  FileText,
  ArrowRight,
  Flame,
  AlertCircle,
  LayoutDashboard,
  BarChart3,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import Portal from "@/components/layout/Portal";

export interface ScopedSearchProject {
  id: string;
  name: string;
  category?: string;
  stage?: string;
  targetUrl?: string | null;
  pages?: Array<{ id: string; title: string; path: string }>;
}

export interface ScopedSearchTask {
  id: string;
  projectId: string;
  projectName?: string;
  title?: string | null;
  content: string;
  priority?: string | null;
  status: string;
  pagePath?: string;
}

interface DeveloperSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: ScopedSearchProject[];
  tasks?: ScopedSearchTask[];
}

interface ResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "PROJECTS" | "TASKS" | "PAGES" | "NAVIGATION";
  href: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

export default function DeveloperSearchModal({
  isOpen,
  onClose,
  projects = [],
  tasks = [],
}: DeveloperSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Static developer navigation items
  const navItems: ResultItem[] = [
    {
      id: "nav-dash",
      title: "Workspace Dashboard",
      subtitle: "Overview, workload matrix & assigned client sandboxes",
      category: "NAVIGATION",
      href: "/developer",
      icon: <LayoutDashboard className="h-4 w-4 text-primary" />,
    },
    {
      id: "nav-tasks",
      title: "Kanban Task Board",
      subtitle: "Interactive panoramic task columns across assigned projects",
      category: "NAVIGATION",
      href: "/developer/tasks",
      icon: <FolderKanban className="h-4 w-4 text-primary" />,
    },
    {
      id: "nav-analytics",
      title: "Productivity & Analytics",
      subtitle: "Personal resolution rate, velocity & SLA turnaround metrics",
      category: "NAVIGATION",
      href: "/developer/analytics",
      icon: <BarChart3 className="h-4 w-4 text-primary" />,
    },
  ];

  // Scoped project items
  const projectItems: ResultItem[] = useMemo(() => {
    return projects.map((p) => ({
      id: `proj-${p.id}`,
      title: p.name,
      subtitle: `${p.category || "Project"} • ${p.targetUrl || "Workspace"}`,
      category: "PROJECTS" as const,
      href: `/developer/tasks?projectId=${p.id}`,
      icon: <FolderKanban className="h-4 w-4 text-primary" />,
    }));
  }, [projects]);

  // Scoped page items
  const pageItems: ResultItem[] = useMemo(() => {
    const list: ResultItem[] = [];
    projects.forEach((p) => {
      (p.pages || []).forEach((pg) => {
        list.push({
          id: `page-${p.id}-${pg.id}`,
          title: pg.title || pg.path,
          subtitle: `${p.name} • ${pg.path}`,
          category: "PAGES" as const,
          href: `/preview/${p.id}?pageId=${pg.id}`,
          icon: <FileText className="h-4 w-4 text-slate-500" />,
        });
      });
    });
    return list;
  }, [projects]);

  // Scoped task items
  const taskItems: ResultItem[] = useMemo(() => {
    return tasks.map((t) => ({
      id: `task-${t.id}`,
      title: t.title || t.content.slice(0, 60),
      subtitle: `${t.projectName || "Project"} • ${t.pagePath || "/"} • ${t.status.replace("_", " ")}`,
      category: "TASKS" as const,
      href: `/preview/${t.projectId}?commentId=${t.id}`,
      icon: <Eye className="h-4 w-4 text-primary" />,
      badge:
        t.priority === "URGENT" ? (
          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Flame className="h-2.5 w-2.5" /> Urgent
          </span>
        ) : t.priority === "HIGH" ? (
          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="h-2.5 w-2.5" /> High
          </span>
        ) : null,
    }));
  }, [tasks]);

  const allItems = useMemo(
    () => [...projectItems, ...taskItems, ...pageItems, ...navItems],
    [projectItems, taskItems, pageItems, navItems]
  );

  // Filter based on query
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allItems.slice(0, 10);
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [query, allItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          router.push(filteredItems[selectedIndex].href);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] flex items-start justify-center pt-20 p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      >
      <div
        className="w-full max-w-xl rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/80 bg-background/50">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search assigned projects, tasks, pages... (Scope limited)"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/80 shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching assigned items found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                    isSelected ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-card border border-border/80 shadow-xs shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate font-display flex items-center gap-1.5">
                        <span className="truncate">{item.title}</span>
                        {item.badge}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-background border border-border/60">
                      {item.category}
                    </span>
                    <ArrowRight className={`h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-transparent"}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info: Scoped info & shortcuts */}
        <div className="px-4 py-2 border-t border-border/60 bg-secondary/30 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Scoped to assigned workspaces</span>
          </span>
        </div>
      </div>
    </div>
    </Portal>
  );
}
