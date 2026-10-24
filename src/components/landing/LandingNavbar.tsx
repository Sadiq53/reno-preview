"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { 
  ArrowRight, 
  Menu, 
  X, 
  ShieldCheck, 
  LayoutDashboard
} from "lucide-react";
import CornerBrackets from "./CornerBrackets";

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
    { label: "Visual Annotator", sup: "01", href: "#interactive-preview" },
    { label: "Zero-Trust WP", sup: "02", href: "#security" },
    { label: "Client Sharing", sup: "03", href: "#features" },
    { label: "Workflow", sup: "04", href: "#workflow" },
    { label: "Metrics", sup: "05", href: "#metrics" },
    { label: "FAQ", sup: "06", href: "#faq" },
  ];

  const userRole = (session?.user as any)?.role;
  const dashboardHref = userRole === "DEVELOPER" ? "/developer" : "/admin";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-border/80 bg-background/90 backdrop-blur-xl shadow-xs py-3"
          : "border-b border-border/40 bg-background/60 backdrop-blur-md py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Subtle Blueprint Accent */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group" title="Crewvia Vanguard">
            <Image
              src="/logo/vanguard-horizontal.png"
              alt="Crewvia Vanguard"
              width={145}
              height={30}
              className="h-7 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              priority
            />
          </Link>
        </div>

        {/* Center: Gojiberry Style Numbered Navigation with Superscripts */}
        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="group text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors flex items-baseline gap-1"
            >
              <span>{link.label}</span>
              <sup className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">
                {link.sup}
              </sup>
            </a>
          ))}
        </nav>

        {/* Right Actions: Technical Corner-Bracketed Buttons */}
        <div className="flex items-center gap-3">
          {status === "authenticated" && session?.user ? (
            <div className="relative">
              <CornerBrackets color="border-primary/60" offset={-4} size={6} />
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2 text-xs font-semibold hover:bg-foreground/90 transition-all active:scale-95 shadow-xs"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-[10px]">
                  <ArrowRight className="h-3 w-3" />
                </div>
                <span>
                  {userRole === "DEVELOPER" ? "Developer Portal" : "Agency Hub"}
                </span>
              </Link>
            </div>
          ) : (
            <>
              {/* Secondary Login with subtle corner brackets */}
              <div className="relative hidden sm:inline-block">
                <CornerBrackets color="border-border hover:border-foreground/40" offset={-3} size={5} />
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/60 rounded-md transition-colors"
                >
                  Login
                </Link>
              </div>

              {/* Primary Launch Action with Embedded Arrow Box & Corner Brackets */}
              <div className="relative">
                <CornerBrackets color="border-primary" offset={-4} size={7} />
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-lg border border-border/80 bg-card pl-1.5 pr-4 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/40 transition-all active:scale-95 shadow-xs group"
                >
                  {/* Embedded Arrow Icon Box */}
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground mr-2.5 shadow-xs transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span>Launch Agency Hub</span>
                </Link>
              </div>
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
        <div className="border-b border-border/80 bg-background/98 px-6 py-5 shadow-2xl backdrop-blur-2xl lg:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2.5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-2 text-sm font-medium text-foreground hover:text-primary transition-colors border-b border-border/40"
              >
                <span>{link.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{link.sup}</span>
              </a>
            ))}

            <div className="mt-4 pt-3 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-foreground text-background px-4 py-3 text-xs font-bold shadow-sm"
              >
                <span>Launch Agency Portal</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
