"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Search,
  ChevronDown,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  User,
  Puzzle,
  Download
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import DeveloperSearchModal, {
  ScopedSearchProject,
  ScopedSearchTask,
} from "./DeveloperSearchModal";
import UserAvatar from "@/components/ui/UserAvatar";

interface DeveloperHeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    avatarUrl?: string | null;
    image?: string | null;
    status?: string | null;
  } | null;
  projects?: ScopedSearchProject[];
  tasks?: ScopedSearchTask[];
}

export default function DeveloperHeader({
  user,
  projects = [],
  tasks = [],
}: DeveloperHeaderProps) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#developer-profile-dropdown-container")) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  const navLinks = [
    {
      name: "Dashboard",
      href: "/developer",
      icon: LayoutDashboard,
      isActive: pathname === "/developer",
    },
    {
      name: "Task Board",
      href: "/developer/tasks",
      icon: FolderKanban,
      isActive: pathname.startsWith("/developer/tasks"),
    },
    {
      name: "Analytics",
      href: "/developer/analytics",
      icon: BarChart3,
      isActive: pathname.startsWith("/developer/analytics"),
    },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "D";

  return (
    <>
      {/* Full-width, single-row, rock-solid centralized header matching AppHeader h-16 standard */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 select-none">
        <div className="flex h-16 items-center justify-between gap-4 w-full">
          {/* 1. Left: Brand Logo & Workspace Identifier */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/developer" className="flex items-center gap-2" title="Crewvia Vanguard">
              <Image
                src="/logo/vanguard-horizontal.png"
                alt="Crewvia Vanguard"
                width={130}
                height={26}
                className="h-6 w-auto object-contain hidden sm:block"
                priority
              />
              <Image
                src="/logo/vanguard-icon.png"
                alt="Crewvia Vanguard"
                width={26}
                height={26}
                className="h-6 w-6 object-contain sm:hidden"
                priority
              />
            </Link>

            <span className="text-muted-foreground/30 text-sm hidden md:inline">/</span>
            <span className="text-xs font-semibold text-muted-foreground hidden md:inline">
              Developer Portal
            </span>
          </div>

          {/* 2. Center: Perfectly Centered Navigation Segmented Control */}
          <div className="flex-1 flex items-center justify-center">
            <nav className="flex items-center gap-1 rounded-xl border border-border/70 bg-secondary/40 p-1 shadow-2xs">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      item.isActive
                        ? "bg-card text-foreground font-bold shadow-xs border border-border/70"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${item.isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 3. Right: Scoped Search, Notifications, Profile Avatar */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Search Input Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 h-9 w-40 md:w-52 rounded-xl border border-input bg-background/80 hover:bg-background px-3 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
              title="Search assigned workspaces and tasks (⌘K)"
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-left truncate font-medium">Search...</span>
              <kbd className="inline-flex items-center gap-0.5 rounded border border-border/80 bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Search Icon */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex sm:hidden h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            <NotificationBell />

            {/* Developer Profile Menu */}
            <div id="developer-profile-dropdown-container" className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-secondary border border-transparent hover:border-border/80 transition-all cursor-pointer"
              >
                <UserAvatar
                  user={user}
                  size="sm"
                  withRing={true}
                  showStatusIndicator={true}
                />
                <div className="text-left hidden lg:block pr-1">
                  <div className="text-xs font-semibold text-foreground leading-tight truncate max-w-[110px]">
                    {user?.name || "Developer"}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">
                    Restricted Dev
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border/80 bg-card p-2 shadow-2xl animate-in fade-in zoom-in-95 z-50">
                  <div className="p-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5 mb-2">
                      <UserAvatar
                        user={user}
                        size="md"
                        withRing={true}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-display font-bold text-xs text-foreground truncate">
                            {user?.name || "Developer"}
                          </span>
                          <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.2 text-[9px] font-semibold">
                            Developer
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {user?.email || "developer@crewvia.agency"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>Zero-Trust Sandbox Active</span>
                    </div>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <Link
                      href="/developer"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Workspace Dashboard</span>
                    </Link>

                    <Link
                      href="/developer/tasks"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                    >
                      <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Task Board</span>
                    </Link>

                    <Link
                      href="/developer/analytics"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Productivity & Analytics</span>
                    </Link>

                    <a
                      href="/api/extension/download"
                      download="crewvia-vanguard-companion-v1.0.0.zip"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Puzzle className="h-3.5 w-3.5 text-primary" />
                        <span>Companion Extension</span>
                      </div>
                      <span className="rounded bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 flex items-center gap-1">
                        <Download className="h-2.5 w-2.5" />
                        .zip
                      </span>
                    </a>
                  </div>

                  <div className="pt-1 border-t border-border/60 p-1">
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Scoped Global Search Modal */}
      <DeveloperSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        projects={projects}
        tasks={tasks}
      />
    </>
  );
}
