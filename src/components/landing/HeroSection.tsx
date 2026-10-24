"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Star,
  ChevronRight,
  Globe,
  ExternalLink
} from "lucide-react";
import CornerBrackets from "./CornerBrackets";
import HeroInteractiveCanvas from "./HeroInteractiveCanvas";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const [inputUrl, setInputUrl] = useState("https://apex-luxury.com/collection");
  const [submittedUrl, setSubmittedUrl] = useState("https://apex-luxury.com/collection");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userRole = (session?.user as any)?.role;
  const targetHref = status === "authenticated" ? (userRole === "DEVELOPER" ? "/developer" : "/admin") : "/login";

  const handleLaunchReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    let formatted = inputUrl.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      formatted = "https://" + formatted;
    }

    setIsSubmitting(true);
    setSubmittedUrl(formatted);

    setTimeout(() => {
      setIsSubmitting(false);
      const canvasEl = document.getElementById("interactive-preview");
      if (canvasEl) {
        canvasEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 400);
  };

  return (
    <section className="relative overflow-hidden pt-28 pb-12 sm:pt-36 sm:pb-20">
      {/* Gojiberry-Style Architectural Isometric Grid & Soft Warm-Cyan Aura */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-40"
      >
        <div className="absolute top-12 h-[600px] w-full max-w-6xl rounded-full bg-gradient-to-b from-cyan-400/20 via-emerald-300/10 to-amber-200/5 blur-3xl" />
        
        {/* Architectural 3D Cube Isometric Grid Wireframe Pattern */}
        <svg 
          className="h-full w-full opacity-20 text-foreground/40" 
          width="100%" 
          height="100%" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="isometric-matrix" width="80" height="138.56" patternUnits="userSpaceOnUse">
              <path 
                d="M40 0 L80 23.09 L80 69.28 L40 92.38 L0 69.28 L0 23.09 Z M40 46.19 L40 92.38 M40 46.19 L0 23.09 M40 46.19 L80 23.09 M40 92.38 L80 115.47 L80 161.66 L40 184.75 L0 161.66 L0 115.47 Z M40 138.56 L40 184.75 M40 138.56 L0 115.47 M40 138.56 L80 115.47" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="0.75" 
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#isometric-matrix)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 1. Gojiberry-Style Top Blueprint Pill with Corner Brackets */}
        <div className="flex justify-center mb-7">
          <div className="relative group inline-block">
            <CornerBrackets color="border-foreground/30 group-hover:border-primary/60 transition-colors" offset={-3} size={6} />
            <div className="inline-flex items-center gap-2.5 rounded-sm border border-border/70 bg-card/80 px-3.5 py-1 text-xs font-medium text-foreground backdrop-blur-md shadow-2xs">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[9px] font-bold text-primary-foreground font-mono">
                CV
              </span>
              <span className="text-muted-foreground font-mono text-[11px]">
                Engineered by <strong className="text-foreground font-semibold">Crewvia Vanguard</strong>
              </span>
              <span className="text-border">&bull;</span>
              <span className="text-primary font-mono text-[11px] font-medium flex items-center gap-1">
                Zero-Trust Standard
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Gojiberry-Style Crisp Centered Editorial Headline */}
        <div className="text-center max-w-3xl mx-auto mb-9 sm:mb-12">
          <h1 className="font-display text-2xl sm:text-4xl md:text-[42px] font-medium tracking-tight text-foreground leading-[1.2] sm:leading-[1.25]">
            Enter your client website. Vanguard generates responsive multi-device previews, captures pinpoint feedback, and brokers zero-trust WordPress logins.
          </h1>
        </div>

        {/* 3. Hero Interactive Input Engine Framed in Technical Corner Brackets */}
        <div className="max-w-2xl mx-auto mb-7">
          <div className="relative p-1">
            {/* Technical Corner Brackets */}
            <CornerBrackets color="border-foreground/50" offset={-4} size={8} />

            <form 
              onSubmit={handleLaunchReview}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-border/90 bg-card/95 p-1.5 sm:p-2 shadow-lg backdrop-blur-xl transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10"
            >
              <div className="flex flex-1 items-center gap-2.5 px-3 py-1.5 sm:py-2">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://your-client-website.com"
                  className="w-full bg-transparent font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden"
                  aria-label="Client Website URL"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold hover:bg-foreground/90 transition-all active:scale-98 shadow-xs cursor-pointer shrink-0 disabled:opacity-70"
              >
                <span>{isSubmitting ? "Generating Preview..." : "Launch Live Review Engine"}</span>
                <ArrowRight className={`h-4 w-4 transition-transform ${isSubmitting ? "translate-x-1" : "group-hover:translate-x-0.5"}`} />
              </button>
            </form>
          </div>
        </div>

        {/* 4. Gojiberry Micro-Social Proof Row (Left: Quote + Avatar | Right: Rating) */}
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 px-2 mb-12 sm:mb-16 text-xs text-muted-foreground">
          {/* Left: Avatar + Quote */}
          <div className="flex items-center gap-2.5">
            <Image
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
              alt="Elena Rostova, Agency Principal"
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover border border-border shadow-2xs"
            />
            <span className="text-[12px] text-foreground/80 italic font-normal">
              &ldquo;It&apos;s like having a zero-trust sentinel on every client project.&rdquo;
            </span>
          </div>

          {/* Right: G2 / Agency Rating */}
          <div className="flex items-center gap-2 font-mono">
            {/* G2 Mark Icon */}
            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500/10 text-amber-600 font-bold text-[10px] border border-amber-500/20">
              G2
            </span>
            <div className="flex items-center gap-0.5 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 stroke-amber-500" />
              ))}
            </div>
            <span className="font-semibold text-foreground text-[12px]">4.9/5</span>
            <span className="text-[11px] text-muted-foreground/75 font-sans">(120+ Agencies)</span>
          </div>
        </div>

        {/* 5. Interactive Canvas Simulator Window with Technical Corner Brackets */}
        <div id="interactive-preview" className="relative mt-2 sm:mt-6">
          <CornerBrackets color="border-foreground/40" offset={-6} size={10} />
          <HeroInteractiveCanvas previewUrl={submittedUrl} />
        </div>
      </div>
    </section>
  );
}
