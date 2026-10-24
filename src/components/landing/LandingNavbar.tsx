"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { 
  ShieldCheck, 
  ArrowRight, 
  Menu, 
  X, 
  Sparkles,
  LayoutDashboard,
  Lock,
  Eye,
  CheckCircle2
} from "lucide-react";

export default function LandingNavbar() {
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Live Canvas", href: "#interactive-preview" },
    { label: "Zero-Trust WP", href: "#security" },
    { label: "Workflow", href: "#workflow" },
    { label: "FAQ", href: "#faq" },
  ];

  const userRole = (session?.user as any)?.role;
  const dashboardHref = userRole === "DEVELOPER" ? "/developer" : "/admin";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-border/80 bg-card/90 backdrop-blur-xl shadow-xs"
          : "border-b border-border/40 bg-card/60 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Status */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group" title="Crewvia Vanguard">
            <Image
              src="/logo/vanguard-horizontal.png"
              alt="Crewvia Vanguard"
              width={140}
              height={28}
              className="h-7 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              priority
            />
          </Link>

          <span className="hidden text-muted-foreground/30 sm:inline">/</span>

          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 md:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Zero-Trust Active</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 rounded-2xl border border-border/60 bg-secondary/50 p-1 shadow-2xs lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-2xs"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Controls & Session State */}
        <div className="flex items-center gap-2.5">
          {status === "authenticated" && session?.user ? (
            <Link
              href={dashboardHref}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 cursor-pointer"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>
                {userRole === "DEVELOPER" ? "Developer Workspace" : "Agency Hub"}
              </span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-secondary hover:border-foreground/20 shadow-2xs sm:inline-flex cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95 cursor-pointer"
              >
                <span>Launch Portal</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-border/80 bg-card/95 px-4 py-4 shadow-xl backdrop-blur-xl lg:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm"
              >
                <span>Launch Vanguard Workspace</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
