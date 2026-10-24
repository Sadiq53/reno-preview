"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ArrowUp, Lock, Sparkles } from "lucide-react";

export default function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-border/80 bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info Column */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo/vanguard-horizontal.png"
                alt="Crewvia Vanguard"
                width={150}
                height={30}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The executive agency visual website annotator and zero-trust WordPress access broker.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 w-fit">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Zero-Plugin Architecture</span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-display">
              Platform Features
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#interactive-preview" className="hover:text-foreground transition-colors">
                  Visual Viewport Annotator
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-foreground transition-colors">
                  Zero-Trust WP Broker
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Scoped Client Share Links
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-foreground transition-colors">
                  Task Progression Kanban
                </a>
              </li>
              <li>
                <a href="/api/extension/download" className="hover:text-foreground transition-colors">
                  Companion Browser Extension
                </a>
              </li>
            </ul>
          </div>

          {/* Zero-Trust Security Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-display">
              Security & Zero-Trust
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-emerald-600" />
                  AES-256-GCM Vault
                </span>
              </li>
              <li>Single-Use 60s Token Grants</li>
              <li>Theme & Plugin Editor Sentinel</li>
              <li>Immutable AuditLog Engine</li>
              <li>Zero Client Database Footprint</li>
            </ul>
          </div>

          {/* Agency Access Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-display">
              Portals
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Agency Owner Workspace
                </Link>
              </li>
              <li>
                <Link href="/developer" className="hover:text-foreground transition-colors">
                  Developer Portal
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Account Sign In
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  Platform Documentation & FAQ
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Crewvia Vanguard. All rights reserved.</span>
            <span className="text-border">&bull;</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
