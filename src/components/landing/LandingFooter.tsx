"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ArrowUp, Lock, Sparkles } from "lucide-react";
import CornerBrackets from "./CornerBrackets";

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
            <div className="pt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 w-fit font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Zero-Plugin Architecture</span>
            </div>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
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
                <a href="#metrics" className="hover:text-foreground transition-colors">
                  Real-time SSE Stream
                </a>
              </li>
            </ul>
          </div>

          {/* Security & Zero-Trust Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              Security Architecture
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-emerald-600" />
                <span>AES-256-GCM Vault</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>Runtime Sentinel Extension</span>
              </li>
              <li>
                <span>Single-Use 60s Session Grants</span>
              </li>
              <li>
                <span>Cryptographic Token Validation</span>
              </li>
              <li>
                <span>Immutable Audit Trail Logging</span>
              </li>
            </ul>
          </div>

          {/* Workspaces & Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              Access Workspaces
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors font-medium text-foreground">
                  Agency Owner Dashboard &rarr;
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Developer Contractor Portal
                </Link>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  Technical Architecture FAQ
                </a>
              </li>
              <li>
                <span className="text-[11px] text-muted-foreground/80 font-mono">
                  Engine: Next.js 14 App Router + PostgreSQL
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: System Status & Copyright */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border/80 bg-secondary/50 px-3 py-1 text-[11px] font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-foreground font-semibold">Systems Operational</span>
              <span className="text-muted-foreground/60">&bull;</span>
              <span className="text-muted-foreground">99.99% Uptime</span>
            </div>
            <span>&copy; {new Date().getFullYear()} Crewvia Vanguard. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <ArrowUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
