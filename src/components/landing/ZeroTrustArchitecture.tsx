"use client";

import React from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  X, 
  Lock, 
  KeyRound, 
  Cpu, 
  Clock, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import CornerBrackets from "./CornerBrackets";

export default function ZeroTrustArchitecture() {
  const comparisonData = [
    {
      feature: "Client Site Footprint",
      traditional: "Bloated plugins or mu-plugins installed on client production database",
      vanguard: "Zero plugins, zero mu-plugins, zero file modifications (100% clean)",
    },
    {
      feature: "Master Password Protection",
      traditional: "Shared plaintext passwords in Slack, spreadsheets, or 1Password",
      vanguard: "AES-256-GCM encrypted in Vault. Never exposed to developer DOM or network",
    },
    {
      feature: "Login Authentication Broker",
      traditional: "Direct manual login via wp-login.php with shared admin credentials",
      vanguard: "Headless server-to-server handshake with single-use 60s ephemeral grant",
    },
    {
      feature: "Malicious Code / Editor Sentinel",
      traditional: "Unrestricted access to theme-editor.php, plugin-editor.php, and file uploads",
      vanguard: "Runtime companion sentinel intercepts and hard-blocks all code editors",
    },
    {
      feature: "Access Revocation & Expiration",
      traditional: "Tedious manual password resets across dozens of client hosting dashboards",
      vanguard: "Auto-expiring assignment dates with 1-click instant session revocation",
    },
    {
      feature: "Compliance & Audit Logging",
      traditional: "Zero accountability for which contractor logged in or edited pages",
      vanguard: "Immutable AuditLog rows recording IP, timestamp, user, and session token",
    },
  ];

  return (
    <section id="security" className="relative py-20 sm:py-28 bg-background border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Gojiberry Style Top Blueprint Pill */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="flex justify-center mb-4">
            <div className="relative inline-block">
              <CornerBrackets color="border-foreground/30" offset={-3} size={5} />
              <div className="inline-flex items-center gap-2 rounded-sm border border-border/80 bg-card px-3.5 py-1 text-xs font-mono font-medium text-foreground backdrop-blur-md shadow-2xs">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Security Protocol</span>
                <span className="text-border">&bull;</span>
                <span className="text-emerald-600 font-semibold">Zero-Trust Model</span>
              </div>
            </div>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Why Modern Agencies Abandon Shared Passwords.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            Eliminate credential leak liability and plugin bloat. Vanguard provides complete zero-trust protection designed specifically for web development agencies and high-value client websites.
          </p>
        </div>

        {/* High-Impact Comparison Table Card Framed in Corner Brackets */}
        <div className="relative rounded-2xl border border-border/90 bg-card shadow-xl overflow-hidden">
          <CornerBrackets color="border-foreground/40" offset={-3} size={8} />

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/80">
            {/* Left: Traditional WordPress Agencies */}
            <div className="p-6 sm:p-8 bg-rose-50/15">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-200/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    The Legacy Agency Trap
                  </h3>
                  <p className="text-xs text-rose-800 font-mono">
                    High Liability • Shared Credentials • Plugin Bloat
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {comparisonData.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 mt-0.5">
                      <X className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground font-mono text-[11px] block text-muted-foreground">
                        {item.feature}
                      </span>
                      <span className="text-muted-foreground/90">{item.traditional}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Crewvia Vanguard Zero-Trust Standard */}
            <div className="p-6 sm:p-8 bg-emerald-50/20">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    The Crewvia Vanguard Standard
                  </h3>
                  <p className="text-xs text-emerald-800 font-mono">
                    Zero Plugins • Ephemeral 60s Grants • AES-256-GCM Vault
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {comparisonData.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-900 font-mono text-[11px] block">
                        {item.feature}
                      </span>
                      <span className="text-foreground font-medium">{item.vanguard}</span>
                    </div>
                  </div>
                ))}
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
