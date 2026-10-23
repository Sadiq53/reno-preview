"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ShieldAlert,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  User,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Plus,
  Download,
  CheckCircle2,
  Puzzle
} from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [hasExtension, setHasExtension] = useState(false);

  // Real-time ping and event detection for companion extension
  useEffect(() => {
    const checkDom = () => {
      const installed =
        document.documentElement.getAttribute("data-vanguard-extension-installed") ||
        document.documentElement.getAttribute("data-reno-extension-installed");
      const ready =
        document.documentElement.getAttribute("data-vanguard-extension-ready") ||
        document.documentElement.getAttribute("data-reno-extension-ready");
      if (installed || ready === "true") {
        setHasExtension(true);
      }
    };
    checkDom();

    const handleReady = () => setHasExtension(true);
    const handleMessage = (e: MessageEvent) => {
      if (
        e.data?.type === "VANGUARD_PONG_EXTENSION" ||
        e.data?.type === "VANGUARD_EXTENSION_READY" ||
        e.data?.type === "RENO_PONG_EXTENSION" ||
        e.data?.type === "RENO_EXTENSION_READY"
      ) {
        setHasExtension(true);
      }
    };

    window.addEventListener("vanguard-extension-ready", handleReady);
    window.addEventListener("reno-extension-ready", handleReady);
    window.addEventListener("message", handleMessage);

    // Initial ping
    window.postMessage({ type: "VANGUARD_PING_EXTENSION" }, window.location.origin);
    window.postMessage({ type: "RENO_PING_EXTENSION" }, window.location.origin);
    const interval = setInterval(() => {
      checkDom();
      window.postMessage({ type: "VANGUARD_PING_EXTENSION" }, window.location.origin);
      window.postMessage({ type: "RENO_PING_EXTENSION" }, window.location.origin);
    }, 2000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("vanguard-extension-ready", handleReady);
      window.removeEventListener("reno-extension-ready", handleReady);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const navItems = [
    {
      label: "Command Hub",
      href: "/admin",
      icon: LayoutDashboard,
      isActive: pathname === "/admin",
    },
    {
      label: "Projects",
      href: "/admin/projects",
      icon: FolderKanban,
      isActive: pathname.startsWith("/admin/projects") || pathname.startsWith("/projects"),
    },
    {
      label: "Team & Access",
      href: "/admin/team",
      icon: Users,
      isActive: pathname.startsWith("/admin/team") || pathname.startsWith("/team"),
    },
    {
      label: "Security Audit",
      href: "/admin/audit",
      icon: ShieldAlert,
      isActive: pathname.startsWith("/admin/audit") || pathname.startsWith("/audit"),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none shadow-xs
          ${isCollapsed ? "w-[68px]" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand Header */}
        <div
          className={`flex h-16 items-center border-b border-border transition-all ${
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {!isCollapsed ? (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-2.5 overflow-hidden text-left"
                onClick={onCloseMobile}
              >
                <div className="flex items-center gap-2">
                  <Image
                    src="/logo/vanguard-horizontal.png"
                    alt="Crewvia Vanguard"
                    width={160}
                    height={32}
                    className="h-7 w-auto object-contain max-w-[168px]"
                    priority
                  />
                </div>
              </Link>

              {/* Desktop Toggle Button */}
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/60 hover:bg-primary/10 border border-border/80 hover:border-primary/40 transition-all cursor-pointer shadow-2xs overflow-hidden"
              title="Click to expand sidebar"
            >
              {/* Default Monogram */}
              <Image
                src="/logo/vanguard-icon.png"
                alt="Vanguard Monogram"
                width={20}
                height={20}
                className="h-4.5 w-4.5 object-contain transition-all duration-200 group-hover:opacity-0 group-hover:scale-50"
                priority
              />
              {/* Hover Expand Icon */}
              <PanelLeft
                className="h-4 w-4 text-primary opacity-0 scale-50 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 absolute"
              />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className={`flex-1 overflow-y-auto py-4 flex flex-col justify-between ${isCollapsed ? "px-1.5" : "px-3"}`}>
          {/* Top Section: Links & Quick Action */}
          <div className="space-y-5">
            {/* Main Links */}
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Management
                </div>
              )}

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group relative flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCollapsed
                        ? "h-9 w-9 mx-auto justify-center"
                        : "gap-3 px-3 py-2"
                    } ${
                      item.isActive
                        ? "bg-[#EFF6FF] text-[#2563EB] shadow-2xs font-bold"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        item.isActive ? "text-[#2563EB]" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    {!isCollapsed && <span className="font-display font-medium tracking-tight">{item.label}</span>}

                    {/* Active Indicator Bar when collapsed */}
                    {isCollapsed && item.isActive && (
                      <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full crewvia-gradient" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="pt-1">
              {!isCollapsed ? (
                <>
                  <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick Action
                  </div>
                  <Link
                    href="/admin/projects/new"
                    onClick={onCloseMobile}
                    className="flex items-center gap-2 rounded-xl border border-dashed border-border/80 bg-secondary/30 p-2.5 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Client Project</span>
                  </Link>
                </>
              ) : (
                <div className="flex justify-center">
                  <Link
                    href="/admin/projects/new"
                    onClick={onCloseMobile}
                    className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-dashed border-border/80 bg-secondary/30 text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shadow-2xs"
                    title="New Client Project"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Companion Extension Card (Above Sign Out button) */}
          <div className="pt-4">
            {!isCollapsed ? (
              <div className={`rounded-xl border p-3 transition-all ${
                hasExtension
                  ? "border-emerald-500/30 bg-emerald-500/5 shadow-2xs"
                  : "border-border/80 bg-secondary/50"
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 font-display">
                    {hasExtension ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span>{hasExtension ? "Companion Active" : "Companion"}</span>
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      hasExtension ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {hasExtension
                    ? "Zero-Trust Sentinel verified in browser."
                    : "Extension inactive. Fallback proxy available."}
                </p>

                {/* State-dependent Action: Download when inactive vs Verified badge when detected */}
                {hasExtension ? (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Extension Verified</span>
                  </div>
                ) : (
                  <a
                    href="/api/extension/download"
                    download="crewvia-vanguard-companion-v1.0.0.zip"
                    className="mt-2.5 flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 px-2 text-[11px] font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download Extension (.zip)</span>
                  </a>
                )}
              </div>
            ) : (
              <div>
                {hasExtension ? (
                  <div
                    className="flex h-8.5 w-8.5 mx-auto items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 relative"
                    title="Companion Extension: Verified & Active in Browser"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
                  </div>
                ) : (
                  <a
                    href="/api/extension/download"
                    download="crewvia-vanguard-companion-v1.0.0.zip"
                    className="flex h-8.5 w-8.5 mx-auto items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all relative cursor-pointer"
                    title="Download Companion Extension (.zip)"
                  >
                    <Download className="h-4 w-4" />
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-card" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Profile & Logout Menu */}
        <div className="border-t border-border/80 p-2.5 bg-secondary/20">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/admin/profile"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5 min-w-0 p-1 rounded-xl hover:bg-secondary transition-colors cursor-pointer"
                title="View Profile Settings"
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
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate font-display">
                    {session?.user?.name || "Admin Owner"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {session?.user?.email || "admin@renohub.agency"}
                  </div>
                </div>
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/admin/profile"
                className="flex items-center justify-center p-0.5 rounded-xl hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
                title={`Profile: ${session?.user?.name || "Admin Owner"}`}
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
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
