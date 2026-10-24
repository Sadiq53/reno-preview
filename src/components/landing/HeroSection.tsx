"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Eye, 
  Lock, 
  FolderKanban, 
  ChevronRight,
  Flame,
  Zap
} from "lucide-react";
import HeroInteractiveCanvas from "./HeroInteractiveCanvas";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role;
  const targetHref = status === "authenticated" ? (userRole === "DEVELOPER" ? "/developer" : "/admin") : "/login";

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Dynamic Ambient Background Illumination Aura */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-full max-w-7xl overflow-hidden blur-3xl opacity-40">
        <div className="h-full w-full bg-gradient-to-b from-cyan-400/30 via-emerald-400/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Badge Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary shadow-xs backdrop-blur-md hover:border-primary/40 transition-colors">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-display">Vanguard Engine 2.0</span>
            <span className="text-muted-foreground/40">&bull;</span>
            <span className="text-foreground/80 font-normal">Next-Gen Visual Web Annotator & Zero-Trust Access Broker</span>
            <ChevronRight className="h-3 w-3 text-primary" />
          </div>
        </div>

        {/* Hero Title & Value Proposition */}
        <div className="text-center max-w-4xl mx-auto space-y-4 mb-10 sm:mb-12">
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.08]">
            Transform How Your Agency{" "}
            <span className="crewvia-gradient-text block sm:inline">
              Reviews, Annotates & Accesses
            </span>{" "}
            Client Websites.
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
            Eliminate messy email threads and insecure password sharing. Provide clients with responsive multi-device previews, drop pinpoint visual feedback, and broker one-click zero-trust WordPress logins with zero plugins.
          </p>

          {/* Primary CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href={targetHref}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 cursor-pointer"
            >
              <span>{status === "authenticated" ? "Open Your Workspace" : "Launch Agency Portal"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#interactive-preview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card/90 px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary hover:border-foreground/20 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Eye className="h-4 w-4 text-primary" />
              <span>Explore Live Canvas</span>
            </a>
          </div>

          {/* Enterprise Trust Badges */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Zero Client Plugins Required
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              100% AES-256-GCM Vault
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Single-Use 60s Session Grants
            </span>
          </div>
        </div>

        {/* Hero Interactive Canvas Simulator Showcase */}
        <div id="interactive-preview" className="mt-6 sm:mt-10">
          <HeroInteractiveCanvas />
        </div>
      </div>
    </section>
  );
}
