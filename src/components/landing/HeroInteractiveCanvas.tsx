"use client";

import React, { useState } from "react";
import Image from "next/image";
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Lock, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Send,
  Eye,
  KeyRound,
  Check
} from "lucide-react";

type ViewportMode = "desktop" | "tablet" | "mobile";

interface AnnotationPin {
  id: number;
  posX: number; // percentage
  posY: number; // percentage
  title: string;
  author: string;
  role: "CLIENT" | "DEVELOPER" | "ADMIN";
  avatar: string;
  time: string;
  content: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  repliesCount: number;
}

export default function HeroInteractiveCanvas() {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isReloading, setIsReloading] = useState(false);
  const [activePinId, setActivePinId] = useState<number | null>(2); // Default to pin 2 open
  const [pins, setPins] = useState<AnnotationPin[]>([
    {
      id: 1,
      posX: 22,
      posY: 24,
      title: "Header Navigation Clearance",
      author: "Sarah Jenkins",
      role: "CLIENT",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      time: "10m ago",
      content: "Can we increase the logo padding by 12px? On smaller resolutions it feels tight against the menu.",
      status: "RESOLVED",
      repliesCount: 3,
    },
    {
      id: 2,
      posX: 52,
      posY: 46,
      title: "Hero CTA Glassmorphism",
      author: "Mustafa Dev",
      role: "DEVELOPER",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mustafa",
      time: "2m ago",
      content: "Applying custom cyan-lime gradient hover transition. Tested across Chrome & Safari viewports.",
      status: "IN_PROGRESS",
      repliesCount: 2,
    },
    {
      id: 3,
      posX: 78,
      posY: 68,
      title: "Typography Alignment",
      author: "Sadiq (Owner)",
      role: "ADMIN",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sadiq",
      time: "Just now",
      content: "Verify Space Grotesk font weights render sharply across HiDPI retina displays.",
      status: "PENDING",
      repliesCount: 1,
    },
  ]);

  const handleToggleStatus = (id: number) => {
    setPins((prev) =>
      prev.map((pin) => {
        if (pin.id === id) {
          const nextStatus =
            pin.status === "PENDING"
              ? "IN_PROGRESS"
              : pin.status === "IN_PROGRESS"
              ? "RESOLVED"
              : "PENDING";
          return { ...pin, status: nextStatus };
        }
        return pin;
      })
    );
  };

  const activePin = pins.find((p) => p.id === activePinId);

  // Compute container width based on selected viewport
  const viewportWidthClass =
    viewport === "desktop"
      ? "max-w-full"
      : viewport === "tablet"
      ? "max-w-[768px]"
      : "max-w-[375px]";

  const handleReload = () => {
    setIsReloading(true);
    setTimeout(() => setIsReloading(false), 600);
  };

  return (
    <div className="relative w-full select-none">
      {/* Outer Glow Halo */}
      <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-r from-cyan-500/15 via-emerald-500/15 to-blue-500/15 blur-2xl opacity-75" />

      {/* Main Glassmorphic Canvas Window Container */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-2xl">
        {/* Top Control Bar / Browser Chrome */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-secondary/40 px-4 py-3 sm:px-6">
          {/* Left: Window Dots & Navigation Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80 shadow-xs" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 shadow-xs" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-xs" />
            </div>

            <button
              type="button"
              onClick={handleReload}
              className="hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary sm:inline-flex transition-colors cursor-pointer"
              title="Reload visual preview"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? "animate-spin text-primary" : ""}`} />
            </button>
          </div>

          {/* Center: Simulated URL Address Pill */}
          <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs max-w-xs sm:max-w-sm w-full sm:w-auto truncate">
            <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="font-mono text-[11px] truncate text-foreground font-medium">
              https://apex-luxury.com/collection
            </span>
            <span className="ml-auto hidden rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-semibold sm:inline-block">
              200 OK
            </span>
          </div>

          {/* Right: Device Viewport Toggle & Zoom Control */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-secondary/60 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewport === "desktop"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Desktop Viewport (1920px)"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setViewport("tablet")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewport === "tablet"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Tablet Viewport (768px)"
              >
                <Tablet className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Tablet</span>
              </button>

              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewport === "mobile"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mobile Viewport (375px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Mobile</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-medium text-muted-foreground border border-border/70 rounded-xl px-2 py-1 bg-secondary/40">
              <span>{viewport === "desktop" ? "1920px" : viewport === "tablet" ? "768px" : "375px"}</span>
            </div>
          </div>
        </div>

        {/* Visual Canvas Viewport Workspace Area */}
        <div className="relative min-h-[460px] sm:min-h-[520px] bg-slate-950/5 flex items-center justify-center p-3 sm:p-6 overflow-hidden dot-grid">
          {/* Scalable Website Mockup Container */}
          <div
            className={`relative w-full rounded-2xl border border-border/90 bg-card shadow-2xl transition-all duration-500 ease-out overflow-hidden ${viewportWidthClass}`}
            style={{ minHeight: "440px" }}
          >
            {/* Mock Client Website Hero Header */}
            <div className="border-b border-border/60 bg-card/90 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="font-display text-xs font-bold tracking-widest uppercase text-foreground">
                  APEX HORLOGERIE
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <span className="text-foreground font-semibold">Chronographs</span>
                <span>Atelier</span>
                <span>Heritage</span>
                <span>Contact</span>
              </div>
              <div className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                Book Viewing
              </div>
            </div>

            {/* Mock Client Website Body */}
            <div className="p-6 sm:p-8 space-y-6 relative">
              {/* Subtle Ambient Mesh Inside Website Mock */}
              <div className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

              {/* Mock Hero Content */}
              <div className="max-w-lg space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Limited Edition 2026
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                  Precision Engineering for Eternal Timepieces.
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crafted by master horologists in Geneva. Titanium casing with perpetual calendar and sapphire anti-reflective crystal.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <div className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm">
                    Inquire Availability
                  </div>
                  <div className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground">
                    Discover Calibre 01
                  </div>
                </div>
              </div>

              {/* Mock Feature Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                <div className="rounded-xl border border-border/80 bg-secondary/40 p-3">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">Reserve</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">72 Hours</div>
                </div>
                <div className="rounded-xl border border-border/80 bg-secondary/40 p-3">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">Waterproof</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">300 Meters</div>
                </div>
                <div className="hidden sm:block rounded-xl border border-border/80 bg-secondary/40 p-3">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase">Movement</div>
                  <div className="text-sm font-bold text-foreground mt-0.5">Automatic Cal.9</div>
                </div>
              </div>
            </div>

            {/* Interactive Pinpoint Annotation Markers Overlay */}
            {pins.map((pin) => {
              const isActive = activePinId === pin.id;
              const statusColor =
                pin.status === "RESOLVED"
                  ? "bg-emerald-500 text-white"
                  : pin.status === "IN_PROGRESS"
                  ? "bg-sky-500 text-white"
                  : "bg-amber-500 text-white";

              return (
                <div
                  key={pin.id}
                  style={{ left: `${pin.posX}%`, top: `${pin.posY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
                  onClick={() => setActivePinId(pin.id)}
                >
                  <div className="relative group">
                    {/* Pulsing Ripple Ring */}
                    <span className="absolute -inset-2 rounded-full bg-primary/20 animate-ping opacity-75" />
                    
                    {/* Pin Head */}
                    <div
                      className={`relative flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold shadow-lg transition-transform hover:scale-110 active:scale-95 ${
                        isActive
                          ? "ring-4 ring-primary/30 scale-110 " + statusColor
                          : statusColor
                      }`}
                    >
                      <span>{pin.id}</span>
                      
                      {/* Check badge if resolved */}
                      {pin.status === "RESOLVED" && (
                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                          <Check className="h-2 w-2" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Floating Glassmorphic Annotation Feedback Card */}
            {activePin && (
              <div
                style={{
                  left: `${Math.min(activePin.posX + 4, 60)}%`,
                  top: `${Math.min(activePin.posY + 2, 50)}%`,
                }}
                className="absolute z-30 w-72 sm:w-80 rounded-2xl border border-border/90 bg-card/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                      #{activePin.id}
                    </span>
                    <span className="text-xs font-bold text-foreground font-display truncate max-w-[140px]">
                      {activePin.title}
                    </span>
                  </div>

                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(activePin.id)}
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold transition-all cursor-pointer ${
                      activePin.status === "RESOLVED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                        : activePin.status === "IN_PROGRESS"
                        ? "bg-sky-100 text-sky-800 border border-sky-300 hover:bg-sky-200"
                        : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                    }`}
                    title="Click to toggle task status"
                  >
                    {activePin.status === "RESOLVED"
                      ? "✓ RESOLVED"
                      : activePin.status === "IN_PROGRESS"
                      ? "● IN PROGRESS"
                      : "○ PENDING"}
                  </button>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-2 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activePin.avatar}
                    alt={activePin.author}
                    className="h-6 w-6 rounded-full border border-border object-cover"
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {activePin.author}
                    </span>
                    <span className="rounded bg-secondary text-muted-foreground px-1.5 py-0.2 text-[9px] font-medium">
                      {activePin.role}
                    </span>
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {activePin.time}
                  </span>
                </div>

                {/* Comment Body */}
                <p className="text-xs leading-relaxed text-muted-foreground mb-3 bg-secondary/30 p-2 rounded-xl border border-border/40">
                  {activePin.content}
                </p>

                {/* Interactive Reply Input Mock */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    readOnly
                    placeholder="Reply to this thread..."
                    value=""
                    className="flex-1 rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 shadow-2xs"
                  />
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                    title="Send reply"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Live Sentinel Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60 border-t border-border/70 bg-card/80 px-4 py-3 sm:px-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5 py-1 sm:py-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-[11px]">Zero-Trust WP Broker</div>
              <div className="text-[10px] text-muted-foreground">Single-use token • 60s TTL RAM</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-1 sm:py-0 sm:px-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-[11px]">Pinpoint Precision</div>
              <div className="text-[10px] text-muted-foreground">Normalized % coordinates</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-1 sm:py-0 sm:pl-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-[11px]">Realtime SSE Bus</div>
              <div className="text-[10px] text-muted-foreground">Instant sync & background push</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
