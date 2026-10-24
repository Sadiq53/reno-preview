"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function CtaSection() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role;
  const targetHref = status === "authenticated" ? (userRole === "DEVELOPER" ? "/developer" : "/admin") : "/login";

  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/90 bg-card p-8 sm:p-14 lg:p-16 shadow-2xl text-center">
          {/* Ambient Decorative Glows */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-full max-w-2xl rounded-full bg-gradient-to-r from-cyan-500/15 via-emerald-500/15 to-primary/15 blur-3xl opacity-80" />

          <div className="relative max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Scale Your Agency With Zero Friction</span>
            </div>

            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
              Ready to Upgrade Your Agency&apos;s Client Review Experience?
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Stop sharing client passwords and wrestling with clunky feedback plugins. Experience pixel-perfect multi-viewport visual reviews and zero-trust WordPress access today.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={targetHref}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 cursor-pointer"
              >
                <span>{status === "authenticated" ? "Access Workspace Dashboard" : "Get Started Now"}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-secondary/50 px-6 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary hover:border-foreground/20 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <span>Developer Portal Sign In</span>
              </Link>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Zero Client Plugins
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                100% AES-256-GCM Vault
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Live in 30 Seconds
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
