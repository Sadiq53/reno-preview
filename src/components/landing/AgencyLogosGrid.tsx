"use client";

import React from "react";
import CornerBrackets from "./CornerBrackets";
import { Star } from "lucide-react";

interface AgencyBrand {
  name: string;
  category: string;
  icon: React.ReactNode;
}

export default function AgencyLogosGrid() {
  const agencies: AgencyBrand[] = [
    {
      name: "Apex Luxury",
      category: "Digital Atelier",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 22 22 22" strokeLinejoin="round" />
          <line x1="12" y1="11" x2="12" y2="17" />
        </svg>
      ),
    },
    {
      name: "Monolith Studio",
      category: "Shopify Plus Partner",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-600" fill="currentColor">
          <rect x="4" y="4" width="7" height="16" rx="1.5" />
          <rect x="13" y="9" width="7" height="11" rx="1.5" />
        </svg>
      ),
    },
    {
      name: "Studio Forma",
      category: "Creative Architecture",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <rect x="8" y="8" width="8" height="8" rx="1" />
        </svg>
      ),
    },
    {
      name: "Vertex Labs",
      category: "Headless Webworks",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 4l8 16 8-16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      name: "Kinetic Commerce",
      category: "Scale eCommerce",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-600" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      name: "Nexus Webworks",
      category: "Enterprise WordPress",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-cyan-600" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <line x1="8.5" y1="7.5" x2="10" y2="16" />
          <line x1="15.5" y1="7.5" x2="14" y2="16" />
        </svg>
      ),
    },
    {
      name: "Lumina Digital",
      category: "Brand & Experience",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5l-2.1 2.1m-8.8 8.8l-2.1 2.1m0-13l2.1 2.1m8.8 8.8l2.1 2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      name: "Horizon Media",
      category: "Global Media Group",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <section className="relative py-14 sm:py-20 overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Subhead with 5 Stars and Social Proof Counter */}
        <div className="flex items-center justify-center gap-2 mb-10 text-center">
          <div className="flex items-center gap-0.5 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 stroke-amber-500" />
            ))}
          </div>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground font-mono">
            Trusted by 120+ high-velocity WordPress & Shopify agencies.
          </span>
        </div>

        {/* 2x4 Agency Card Grid Framed with Delicate Corner Brackets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {agencies.map((agency, idx) => (
            <div
              key={agency.name}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card/60 hover:bg-card px-4 py-6 text-center transition-all duration-300 hover:shadow-md hover:border-primary/40 backdrop-blur-xs"
            >
              {/* Technical Blueprint Corner Brackets */}
              <CornerBrackets
                color="border-muted-foreground/30 group-hover:border-primary/60 transition-colors"
                offset={-2}
                size={6}
              />

              <div className="flex h-10 w-10 items-center justify-center mb-2.5 transition-transform duration-300 group-hover:scale-110">
                {agency.icon}
              </div>

              <span className="font-display text-sm font-bold tracking-tight text-foreground">
                {agency.name}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/80 mt-0.5 uppercase tracking-wider">
                {agency.category}
              </span>
            </div>
          ))}
        </div>

        {/* Center Crosshair Marker (+) Divider */}
        <div className="relative mt-14 sm:mt-20 flex items-center justify-center">
          <div className="w-full border-t border-border/60" />
          <span className="absolute bg-background px-3 font-mono text-xs text-muted-foreground/50 select-none">
            +
          </span>
        </div>
      </div>
    </section>
  );
}
