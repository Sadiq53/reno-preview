"use client";

import React, { useState } from "react";
import { 
  Eye, 
  KeyRound, 
  Share2, 
  Zap, 
  ShieldCheck, 
  Lock, 
  Copy, 
  Check, 
  Sparkles, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ArrowRight,
  Bell,
  Code2,
  Terminal,
  Activity
} from "lucide-react";

export default function FeaturesBentoGrid() {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeShareRole, setActiveShareRole] = useState<"COMMENTER" | "VIEWER">("COMMENTER");

  const handleCopy = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section id="features" className="relative py-20 sm:py-28 bg-secondary/20 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Engineered for High-Velocity Web Agencies</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Complete Agency Operating System.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Four specialized modules that transform how agencies collaborate, collect client feedback, and access remote client WordPress environments without security vulnerabilities.
          </p>
        </div>

        {/* Bento Grid Layout (2x2 with dynamic spans) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Visual Multi-Device Annotator (Spans 2 columns on LG) */}
          <div className="lg:col-span-2 group rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            {/* Top decorative glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl group-hover:bg-cyan-500/15 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                  <Eye className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 px-2.5 py-0.5 text-[11px] font-semibold">
                  Normalized Coordinates
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Responsive Multi-Device Visual Annotator
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                Seamlessly preview client websites on Desktop (1920px), Tablet (768px), and Mobile (375px) viewports with canvas zoom and pan. Annotation pins normalize coordinates as exact percentages so feedback stays accurately locked across any device scale.
              </p>
            </div>

            {/* Custom Interactive Micro-Visual */}
            <div className="mt-6 rounded-2xl border border-border/80 bg-secondary/50 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Pin #24 • PosX: 42.15% • PosY: 68.40%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded bg-card px-2 py-0.5 font-semibold text-foreground border border-border/60">
                    Tablet 768px
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-xs text-primary-foreground">
                  #24
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Mobile Navigation Overlap</span>
                    <span className="rounded bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.2 text-[9px] font-semibold">
                      IN PROGRESS
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    "Ensure drawer navigation does not clip on iOS 17 Safari viewports."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Zero-Trust WordPress Broker */}
          <div className="group rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/15 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                  Zero Plugins
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-foreground tracking-tight">
                Zero-Trust WordPress Broker
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Developers log into WordPress admin with 1-click via the Companion Extension. Master credentials never leak, and capability sentinels block code editing and theme alterations.
              </p>
            </div>

            {/* Custom Interactive Micro-Visual */}
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Grant Dispatched
                </span>
                <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  TTL: 58s
                </span>
              </div>
              <div className="text-[10px] text-emerald-900 font-mono bg-white/80 p-2 rounded-lg border border-emerald-200 truncate">
                Bearer: 61e0f9b...a17b (Ephemeral RAM)
              </div>
            </div>
          </div>

          {/* Card 3: Cryptographic Client Share Links */}
          <div className="group rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl group-hover:bg-amber-500/15 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Share2 className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold">
                  Zero Signup Friction
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-foreground tracking-tight">
                Scoped Client Share Links
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Deliver client review links with scoped roles: Read-Only (Viewer) or Interactive Pin Annotations (Commenter). Clients review without creating accounts.
              </p>
            </div>

            {/* Custom Interactive Share Link Mock */}
            <div className="mt-6 rounded-2xl border border-border/80 bg-secondary/50 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 bg-card p-1 rounded-xl border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveShareRole("COMMENTER")}
                  className={`flex-1 py-1 rounded-lg text-center font-semibold text-[11px] transition-all cursor-pointer ${
                    activeShareRole === "COMMENTER"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Commenter
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShareRole("VIEWER")}
                  className={`flex-1 py-1 rounded-lg text-center font-semibold text-[11px] transition-all cursor-pointer ${
                    activeShareRole === "VIEWER"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Viewer Only
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-xl border border-border/60 text-[11px]">
                <span className="font-mono truncate text-muted-foreground flex-1">
                  vanguard.agency/share/tk_84f9...
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  title="Copy share link"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Realtime Pipeline & FCM Web Push (Spans 2 columns on LG) */}
          <div className="lg:col-span-2 group rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-primary/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between">
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl group-hover:bg-blue-500/15 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-primary border border-blue-500/20">
                  <Bell className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold">
                  SSE + FCM Push
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Realtime Event Bus & Background Web Push
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                Every task assignment, comment, and resolution event broadcasts immediately via Server-Sent Events (SSE) with audio chimes. Firebase Cloud Messaging delivers background desktop alerts even when tabs are closed.
              </p>
            </div>

            {/* Custom Terminal Stream Mock */}
            <div className="mt-6 rounded-2xl border border-border/90 bg-slate-950 text-slate-100 p-4 font-mono text-[11px] space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-cyan-400" />
                  Live Event Pipeline Log
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Activity className="h-2.5 w-2.5 animate-pulse" />
                  Streaming
                </span>
              </div>
              <div className="text-slate-300 flex items-center gap-2 truncate">
                <span className="text-cyan-400">[SSE:200]</span>
                <span>COMMENT_CREATED: "Sarah dropped pin on /collection"</span>
              </div>
              <div className="text-slate-300 flex items-center gap-2 truncate">
                <span className="text-emerald-400">[FCM:PUSH]</span>
                <span>DESKTOP_ALERT delivered to Mustafa (Restricted Dev)</span>
              </div>
              <div className="text-slate-400 flex items-center gap-2 truncate text-[10px]">
                <span className="text-amber-400">[AUDIT:LOG]</span>
                <span>Single-use WP login grant consumed by Chrome Extension Sentinel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
