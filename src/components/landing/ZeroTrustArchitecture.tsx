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

export default function ZeroTrustArchitecture() {
  const comparisonData = [
    {
      feature: "Client WordPress Site Footprint",
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
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Zero-Trust Enterprise Security Model</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Why Agencies Abandon Shared Passwords.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Eliminate credential leak liability and plugin bloat. Vanguard provides complete zero-trust protection designed specifically for web development agencies and client sites.
          </p>
        </div>

        {/* High-Impact Comparison Table Card */}
        <div className="overflow-hidden rounded-3xl border border-border/90 bg-card shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/80">
            {/* Left: Traditional WordPress Agencies */}
            <div className="p-6 sm:p-8 bg-rose-50/20">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-200/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 border border-rose-200">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-rose-950">
                    Traditional Agency Workflows
                  </h3>
                  <p className="text-xs text-rose-700/80">High liability, shared passwords & plugin bloat</p>
                </div>
              </div>

              <div className="space-y-4">
                {comparisonData.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 mt-0.5">
                      <X className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground mb-0.5">{item.feature}</div>
                      <div className="text-muted-foreground">{item.traditional}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Crewvia Vanguard Standard */}
            <div className="p-6 sm:p-8 bg-emerald-50/30 relative">
              <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-emerald-200/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-emerald-950 flex items-center gap-2">
                      <span>Crewvia Vanguard Standard</span>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.2 text-[9px] font-bold">
                        Zero-Trust
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-800/80">AES-256 encrypted, 60s single-use tokens & sentinels</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {comparisonData.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white mt-0.5 shadow-xs">
                      <Check className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="font-semibold text-emerald-950 mb-0.5">{item.feature}</div>
                      <div className="text-muted-foreground">{item.vanguard}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
