"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  FolderKanban,
  Users,
  ShieldAlert,
  ArrowRight,
  Plus,
  Eye,
  Settings,
  LayoutDashboard,
  ExternalLink
} from "lucide-react";
import Portal from "@/components/layout/Portal";

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "PROJECTS" | "NAVIGATION" | "ACTIONS";
  href: string;
  icon: React.ReactNode;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch available projects once when opened
  useEffect(() => {
    if (isOpen) {
      fetch("/api/projects")
        .then((res) => res.json())
        .then((data) => {
          if (data?.projects) setProjects(data.projects);
        })
        .catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Static navigation items
  const staticItems: SearchItem[] = [
    {
      id: "nav-dash",
      title: "Command Hub",
      subtitle: "Executive overview & performance metrics",
      category: "NAVIGATION",
      href: "/admin",
      icon: <LayoutDashboard className="h-4 w-4 text-primary" />,
    },
    {
      id: "nav-projects",
      title: "Projects Directory",
      subtitle: "Manage all client web projects",
      category: "NAVIGATION",
      href: "/admin/projects",
      icon: <FolderKanban className="h-4 w-4 text-primary" />,
    },
    {
      id: "nav-team",
      title: "Team & Contractors",
      subtitle: "Developer roster and access credential management",
      category: "NAVIGATION",
      href: "/admin/team",
      icon: <Users className="h-4 w-4 text-sky-600" />,
    },
    {
      id: "nav-audit",
      title: "Security Audit Logs",
      subtitle: "Zero-trust session dispatched events",
      category: "NAVIGATION",
      href: "/admin/audit",
      icon: <ShieldAlert className="h-4 w-4 text-amber-600" />,
    },
    {
      id: "act-new-project",
      title: "Create New Project",
      subtitle: "Register client site and provision 256-bit secret",
      category: "ACTIONS",
      href: "/admin/projects/new",
      icon: <Plus className="h-4 w-4 text-accent" />,
    },
  ];

  // Dynamic project items
  const projectItems: SearchItem[] = projects.map((p) => ({
    id: `proj-${p.id}`,
    title: p.name,
    subtitle: `${p.clientName} • ${p.targetUrl}`,
    category: "PROJECTS",
    href: `/admin/projects/${p.id}`,
    icon: <FolderKanban className="h-4 w-4 text-primary" />,
  }));

  const allItems = [...projectItems, ...staticItems];

  // Filter based on query
  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/80 bg-background/50">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search projects, team, logs..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/80 shrink-0">
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No results found for "{query}".
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
                      <div className="text-xs font-semibold text-foreground truncate font-display">
                        {item.title}
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

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-border/60 bg-secondary/30 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span className="font-mono text-[10px]">Crewvia Vanguard QuickSearch</span>
        </div>
      </div>
    </div>
    </Portal>
  );
}
