"use client";

import React from "react";
import Image from "next/image";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Sparkles,
  Quote,
  Star
} from "lucide-react";
import CornerBrackets from "./CornerBrackets";

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
    <section id="metrics" className="relative py-20 sm:py-28 bg-background border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Gojiberry Style Top Blueprint Pill */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="flex justify-center mb-4">
            <div className="relative inline-block">
              <CornerBrackets color="border-foreground/30" offset={-3} size={5} />
              <div className="inline-flex items-center gap-2 rounded-sm border border-border/80 bg-card px-3.5 py-1 text-xs font-mono font-medium text-foreground backdrop-blur-md shadow-2xs">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Platform Telemetry</span>
                <span className="text-border">&bull;</span>
                <span className="text-emerald-600 font-semibold">99.99% Reliability</span>
              </div>
            </div>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Verified Agency Performance.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            Proven metrics measured across agency teams, freelance contractors, and high-value WordPress production sites.
          </p>
        </div>

        {/* Metric Cards Grid Framed in Corner Brackets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs hover:shadow-lg transition-all duration-300"
              >
                <CornerBrackets color="border-muted-foreground/30 group-hover:border-primary/60 transition-colors" offset={-2} size={6} />

                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border mb-3 ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>

                <div className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  {item.value}
                </div>

                <div className="text-xs sm:text-sm font-semibold text-foreground mt-1">
                  {item.label}
                </div>

                <div className="text-[11px] text-muted-foreground mt-1 leading-normal">
                  {item.subtext}
                </div>
              </div>
            );
          })}
        </div>

        {/* Agency Leadership Testimonial Card Framed in Corner Brackets */}
        <div className="relative rounded-2xl border border-border/90 bg-card/80 p-6 sm:p-10 shadow-lg backdrop-blur-xs">
          <CornerBrackets color="border-foreground/40" offset={-3} size={8} />

          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 stroke-amber-500" />
              ))}
            </div>

            <blockquote className="font-display text-base sm:text-xl font-medium text-foreground leading-relaxed italic">
              &ldquo;Vanguard completely transformed our client onboarding. We no longer install intrusive staging plugins on client sites or hand out master administrator credentials to freelance contractors. Our review cycles dropped from 12 days to under 48 hours.&rdquo;
            </blockquote>

            <div className="pt-2 flex items-center justify-center gap-3">
              <Image
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces"
                alt="Julian Vance, Principal at Apex Digital"
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover border border-border"
              />
              <div className="text-left text-xs">
                <div className="font-bold text-foreground">Julian Vance</div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  Principal, Apex Digital Atelier (London &bull; New York)
                </div>
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
