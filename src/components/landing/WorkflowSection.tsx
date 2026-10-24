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
    <section id="workflow" className="relative py-20 sm:py-28 bg-secondary/30 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Frictionless 4-Step Agency Workflow</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            How Elite Agencies Operate with Vanguard.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            From initial client kickoff to resolved visual bugs and secure development access — engineered for maximum velocity and zero risk.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group rounded-3xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-display text-2xl font-bold text-muted-foreground/40 group-hover:text-primary transition-colors">
                      {item.step}
                    </span>
                    <span className="rounded-full bg-secondary text-foreground border border-border/70 px-2.5 py-0.5 text-[10px] font-semibold">
                      {item.badge}
                    </span>
                  </div>

                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} border border-border/60 group-hover:scale-105 transition-transform`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="font-display text-lg font-bold text-foreground tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-[11px]">Phase {idx + 1} of 4</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
