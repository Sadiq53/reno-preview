"use client";

import React, { useState } from "react";
import { 
  Eye, 
  KeyRound, 
  Share2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Sparkles, 
  Bell, 
  Terminal, 
  Activity 
} from "lucide-react";
import CornerBrackets from "./CornerBrackets";

export default function FeaturesBentoGrid() {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeShareRole, setActiveShareRole] = useState<"COMMENTER" | "VIEWER">("COMMENTER");

  const handleCopy = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section id="features" className="relative py-20 sm:py-28 bg-background border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Gojiberry Style Top Blueprint Pill */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="flex justify-center mb-4">
            <div className="relative inline-block">
              <CornerBrackets color="border-foreground/30" offset={-3} size={5} />
              <div className="inline-flex items-center gap-2 rounded-sm border border-border/80 bg-card px-3.5 py-1 text-xs font-mono font-medium text-foreground backdrop-blur-md shadow-2xs">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Modular Architecture</span>
                <span className="text-border">&bull;</span>
                <span className="text-primary font-semibold">01 — 04 Core Engines</span>
              </div>
            </div>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Complete Agency Operating System.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            Four specialized engines that transform how elite digital agencies review websites, capture client feedback, and broker zero-trust WordPress access with zero plugins.
          </p>
        </div>

        {/* Bento Grid Layout (2x2 with dynamic spans & corner brackets) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Visual Multi-Device Annotator (Spans 2 columns on LG) */}
          <div className="lg:col-span-2 group relative rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 overflow-hidden flex flex-col justify-between">
            <CornerBrackets color="border-muted-foreground/30 group-hover:border-primary/60 transition-colors" offset={-2} size={7} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                  <Eye className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground/70">ENGINE</span>
                  <span className="font-bold text-primary">01</span>
                </div>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Responsive Multi-Device Visual Annotator
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                Seamlessly preview client websites on Desktop (1920px), Tablet (768px), and Mobile (375px) viewports with canvas zoom and pan. Annotation pins normalize coordinates as exact percentages so feedback stays accurately locked across any device scale.
              </p>
            </div>

            {/* Custom Interactive Micro-Visual */}
            <div className="mt-6 rounded-xl border border-border/80 bg-secondary/30 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/60 text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Pin #24 • PosX: 42.15% • PosY: 68.40%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded bg-card px-2 py-0.5 font-semibold text-foreground border border-border/60 font-mono text-[10px]">
                    Tablet 768px
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-xs text-primary-foreground shadow-xs">
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
                    &ldquo;Ensure drawer navigation does not clip on iOS 17 Safari viewports.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Zero-Trust WordPress Broker */}
          <div className="group relative rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 overflow-hidden flex flex-col justify-between">
            <CornerBrackets color="border-muted-foreground/30 group-hover:border-emerald-500/60 transition-colors" offset={-2} size={7} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground/70">ENGINE</span>
                  <span className="font-bold text-emerald-600">02</span>
                </div>
              </div>

              <h3 className="font-display text-xl font-bold text-foreground tracking-tight">
                Zero-Trust WordPress Broker
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Developers log into WordPress admin with 1-click via the Companion Extension. Master credentials never leak, and capability sentinels block code editing and theme alterations.
              </p>
            </div>

            {/* Custom Interactive Micro-Visual */}
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Grant Dispatched
                </span>
                <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                  TTL: 58s
                </span>
              </div>
              <div className="text-[10px] text-emerald-900 font-mono bg-white/90 p-2 rounded-lg border border-emerald-200 truncate shadow-2xs">
                Bearer: 61e0f9b...a17b (Ephemeral RAM)
              </div>
            </div>
          </div>

          {/* Card 3: Cryptographic Client Share Links */}
          <div className="group relative rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 overflow-hidden flex flex-col justify-between">
            <CornerBrackets color="border-muted-foreground/30 group-hover:border-amber-500/60 transition-colors" offset={-2} size={7} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Share2 className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground/70">ENGINE</span>
                  <span className="font-bold text-amber-600">03</span>
                </div>
              </div>

              <h3 className="font-display text-xl font-bold text-foreground tracking-tight">
                Scoped Client Share Links
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Deliver client review links with scoped roles: Read-Only (Viewer) or Interactive Pin Annotations (Commenter). Clients review without creating accounts.
              </p>
            </div>

            {/* Custom Interactive Share Link Mock */}
            <div className="mt-6 rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 bg-card p-1 rounded-lg border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveShareRole("COMMENTER")}
                  className={`flex-1 py-1 rounded-md text-center font-semibold text-[11px] transition-all cursor-pointer ${
                    activeShareRole === "COMMENTER"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Commenter
                </button>
                <button
                  type="button"
                  onClick={() => setActiveShareRole("VIEWER")}
                  className={`flex-1 py-1 rounded-md text-center font-semibold text-[11px] transition-all cursor-pointer ${
                    activeShareRole === "VIEWER"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Viewer Only
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-card px-2.5 py-1.5 rounded-lg border border-border/60 text-[11px]">
                <span className="font-mono truncate text-muted-foreground flex-1">
                  vanguard.agency/share/tk_84f9...
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  title="Copy share link"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Realtime Pipeline & FCM Web Push (Spans 2 columns on LG) */}
          <div className="lg:col-span-2 group relative rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 overflow-hidden flex flex-col justify-between">
            <CornerBrackets color="border-muted-foreground/30 group-hover:border-primary/60 transition-colors" offset={-2} size={7} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-primary border border-blue-500/20">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-muted-foreground/70">ENGINE</span>
                  <span className="font-bold text-primary">04</span>
                </div>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Realtime Event Bus & Background Web Push
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                Every task assignment, comment, and resolution event broadcasts immediately via Server-Sent Events (SSE) with audio chimes. Firebase Cloud Messaging delivers background desktop alerts even when tabs are closed.
              </p>
            </div>

            {/* Custom Terminal Stream Mock */}
            <div className="mt-6 rounded-xl border border-border/90 bg-slate-950 text-slate-100 p-4 font-mono text-[11px] space-y-1.5 shadow-inner">
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
                <span className="text-cyan-400 font-bold">[SSE:200]</span>
                <span>COMMENT_CREATED: &ldquo;Sarah dropped pin on /collection&rdquo;</span>
              </div>
              <div className="text-slate-300 flex items-center gap-2 truncate">
                <span className="text-emerald-400 font-bold">[FCM:PUSH]</span>
                <span>DESKTOP_ALERT delivered to Mustafa (Restricted Dev)</span>
              </div>
              <div className="text-slate-400 flex items-center gap-2 truncate text-[10px]">
                <span className="text-amber-400 font-bold">[AUDIT:LOG]</span>
                <span>Single-use WP login grant consumed by Chrome Extension Sentinel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Crosshair Marker (+) Divider */}
        <div className="relative mt-16 sm:mt-24 flex items-center justify-center">
          <div className="w-full border-t border-border/60" />
          <span className="absolute bg-background px-3 font-mono text-xs text-muted-foreground/50 select-none">
            +
          </span>
        </div>
      </div>
    </section>
  );
}
