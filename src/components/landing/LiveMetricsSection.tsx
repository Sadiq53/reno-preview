"use client";

import React from "react";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Lock, 
  FolderKanban, 
  Sparkles,
  Quote,
  Star
} from "lucide-react";

export default function LiveMetricsSection() {
  const metrics = [
    {
      value: "12,400+",
      label: "Visual Tasks Resolved",
      subtext: "Pinpoint feedback across responsive viewports",
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      value: "100%",
      label: "Zero-Plugin Footprint",
      subtext: "Zero plugins installed on client WordPress sites",
      icon: ShieldCheck,
      color: "text-cyan-700 bg-cyan-50 border-cyan-200",
    },
    {
      value: "60s",
      label: "Single-Use Grant TTL",
      subtext: "Ephemeral tokens hashed in RAM with zero storage",
      icon: Lock,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      value: "< 15ms",
      label: "Real-time Event Latency",
      subtext: "Server-Sent Events & background FCM web push",
      icon: Zap,
      color: "text-primary bg-primary/10 border-primary/20",
    },
  ];

  return (
    <section className="relative py-16 sm:py-24 bg-background border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border mb-3 ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  {item.value}
                </div>
                <div className="mt-1 text-xs sm:text-sm font-semibold text-foreground">
                  {item.label}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                  {item.subtext}
                </div>
              </div>
            );
          })}
        </div>

        {/* Agency Executive Testimonial Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/90 bg-card p-6 sm:p-10 shadow-lg">
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
            <div className="max-w-3xl space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                ))}
                <span className="ml-2 text-xs font-bold text-foreground font-display">5.0 Agency Standard</span>
              </div>

              <blockquote className="text-sm sm:text-lg text-foreground font-medium leading-relaxed italic">
                &ldquo;Vanguard completely transformed how our agency onboards freelance developers and collects client feedback. We no longer distribute client passwords or install clunky feedback plugins. It paid for itself in week one.&rdquo;
              </blockquote>

              <div className="pt-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display font-bold text-xs text-primary-foreground">
                  AS
                </div>
                <div>
                  <div className="font-display text-xs sm:text-sm font-bold text-foreground">
                    Alex Sterling
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Founder & Technical Director &bull; Sterling & Co. Digital
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto rounded-2xl border border-border/70 bg-secondary/50 p-4">
              <div className="text-right">
                <div className="text-xs font-bold text-foreground">42 Client Sites</div>
                <div className="text-[11px] text-emerald-700 font-semibold">100% Zero-Trust Active</div>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-600 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
