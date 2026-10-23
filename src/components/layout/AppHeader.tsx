"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Menu,
  Search,
  Plus,
  Bell,
  ChevronDown,
  User,
  LogOut,
  ShieldCheck,
  ExternalLink,
  Laptop,
  Puzzle,
  Download
} from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import GlobalSearchModal from "./GlobalSearchModal";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserAvatar from "@/components/ui/UserAvatar";

interface AppHeaderProps {
  onOpenMobileMenu: () => void;
  projectName?: string;
}

export default function AppHeader({ onOpenMobileMenu, projectName }: AppHeaderProps) {
  const { data: session } = useSession();
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

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#user-profile-menu-container")) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-card/95 px-4 sm:px-6 backdrop-blur-md select-none">
        {/* Left Section: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary lg:hidden cursor-pointer"
            title="Open Mobile Navigation"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Breadcrumbs projectName={projectName} />
        </div>

        {/* Center / Right Section: Global Search Bar & Actions */}
        <div className="flex items-center gap-3">
          {/* Global Search Bar (opens modal) */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2.5 h-9 w-64 lg:w-80 rounded-xl border border-input bg-background/80 hover:bg-background px-3 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left truncate font-medium">Search projects, tasks, team...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/80 bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Mobile Search Icon Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Quick Create Project Button */}
          <Link
            href="/admin/projects/new"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-xl bg-primary hover:bg-primary/90 px-3 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </Link>

          {/* Notification Center */}
          <NotificationBell />

          {/* User Profile Menu Dropdown */}
          <div id="user-profile-menu-container" className="relative">
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-secondary/80 border border-transparent hover:border-border/80 transition-all cursor-pointer"
            >
              <UserAvatar
                user={{
                  name: session?.user?.name,
                  avatarUrl: session?.user?.image,
                  email: session?.user?.email,
                }}
                size="sm"
                withRing={true}
              />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
            </button>

            {/* Profile Dropdown Card */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border/80 bg-card p-2 shadow-2xl animate-in fade-in zoom-in-95 z-50">
                <div className="p-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5 mb-2">
                    <UserAvatar
                      user={{
                        name: session?.user?.name,
                        avatarUrl: session?.user?.image,
                        email: session?.user?.email,
                      }}
                      size="md"
                      withRing={true}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-xs text-foreground truncate">
                          {session?.user?.name || "Admin Owner"}
                        </span>
                        <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-semibold">
                          Owner
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {session?.user?.email || "admin@crewvia.agency"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <Link
                    href="/admin/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>My Profile & Settings</span>
                  </Link>

                  <Link
                    href="/developer"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
                  >
                    <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Developer Workspace</span>
                  </Link>

                  <a
                    href="/api/extension/download"
                    download="crewvia-vanguard-companion-v1.0.0.zip"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
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
      </header>

      {/* Global Search Command Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
