"use client";

import React from "react";
import { 
  Globe, 
  MessageSquare, 
  UserCheck, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2,
  Sparkles,
  Layers,
  ShieldCheck
} from "lucide-react";
import CornerBrackets from "./CornerBrackets";

export default function WorkflowSection() {
  const steps = [
    {
      step: "01",
      title: "Add Any Website in 5 Seconds",
      description: "No hosting, FTP, or server credentials required. Simply provide the target client website URL and Vanguard auto-discovers multi-page inspection paths.",
      icon: Globe,
      badge: "Instant Setup",
      color: "from-cyan-500/20 to-blue-500/10 text-cyan-600",
    },
    {
      step: "02",
      title: "Collect Visual Client Feedback",
      description: "Generate scoped shareable links (Viewer vs Commenter). Clients inspect responsive viewports and click anywhere to drop pinpoint task markers without signing up.",
      icon: MessageSquare,
      badge: "Zero Friction",
      color: "from-primary/20 to-cyan-500/10 text-primary",
    },
    {
      step: "03",
      title: "Assign Developers with Expiration",
      description: "Assign developers or freelance contractors to projects with strict expiration dates. Developers see only their assigned visual tasks and project pages.",
      icon: UserCheck,
      badge: "Role Scoped",
      color: "from-amber-500/20 to-orange-500/10 text-amber-600",
    },
    {
      step: "04",
      title: "1-Click Zero-Trust WP Login",
      description: "Developers launch into WordPress admin with 1-click through the Companion Extension. Master credentials never leak, and sentinels lock file editors.",
      icon: KeyRound,
      badge: "Zero-Trust",
      color: "from-emerald-500/20 to-teal-500/10 text-emerald-600",
    },
  ];

  return (
    <section id="workflow" className="relative py-20 sm:py-28 bg-background border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Gojiberry Style Top Blueprint Pill */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="flex justify-center mb-4">
            <div className="relative inline-block">
              <CornerBrackets color="border-foreground/30" offset={-3} size={5} />
              <div className="inline-flex items-center gap-2 rounded-sm border border-border/80 bg-card px-3.5 py-1 text-xs font-mono font-medium text-foreground backdrop-blur-md shadow-2xs">
                <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
                <span className="text-muted-foreground">End-to-End Flow</span>
                <span className="text-border">&bull;</span>
                <span className="text-primary font-semibold">4-Phase Pipeline</span>
              </div>
            </div>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            How Leading Agencies Ship Faster.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            A frictionless agency pipeline that eliminates chaotic screenshots, protects client site security, and accelerates client sign-offs.
          </p>
        </div>

        {/* 4-Step Cards Grid Framed in Corner Brackets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between"
              >
                <CornerBrackets color="border-muted-foreground/30 group-hover:border-primary/60 transition-colors" offset={-2} size={6} />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-bold text-foreground/80 group-hover:text-primary transition-colors">
                      {item.step}
                    </span>
                    <span className="rounded-full bg-secondary text-foreground/80 border border-border/60 px-2 py-0.5 text-[10px] font-mono font-semibold">
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/80 text-foreground mb-4 border border-border/70 group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>

                  <h3 className="font-display text-base font-bold text-foreground tracking-tight">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[10px] text-muted-foreground/75">
                    Phase {item.step} of 04
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
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
