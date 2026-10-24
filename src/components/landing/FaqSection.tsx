"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import CornerBrackets from "./CornerBrackets";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const faqs = [
    {
      index: "01",
      question: "Do we need to install any WordPress plugin on our client sites?",
      answer:
        "No, absolutely none. Vanguard operates entirely zero-plugin and zero-mu-plugin. The visual annotator previews websites via an interactive proxy iframe, and developer authentication uses an ephemeral server-to-server handshake against standard wp-login.php. Your client's production database remains 100% untouched and clean.",
    },
    {
      index: "02",
      question: "How does Zero-Trust WordPress Login work without revealing master passwords?",
      answer:
        "Client master credentials are stored encrypted with AES-256-GCM in PostgreSQL. When an assigned developer clicks 'Launch WordPress', Vanguard completes a headless login handshake against wp-login.php in ephemeral RAM. A single-use 60-second grant token is dispatched directly to the Vanguard Companion Extension, which injects authenticated session cookies. The developer never sees, touches, or stores the master password.",
    },
    {
      index: "03",
      question: "Can clients leave feedback and drop pins without creating an account?",
      answer:
        "Yes! You can generate scoped shareable preview links (/share/[token]) with either 'Viewer' (read-only inspection) or 'Commenter' permissions. Commenters simply enter their name once and can immediately click anywhere to drop pinpoint task markers, reply to threads, and inspect responsive viewports without friction.",
    },
    {
      index: "04",
      question: "How does the Companion Extension protect client sites from unauthorized changes?",
      answer:
        "The Vanguard Companion Extension features a built-in capability sentinel. When a developer is logged in via a restricted grant, the extension intercepts and hard-blocks navigation to dangerous file editor endpoints like /wp-admin/plugin-editor.php and /wp-admin/theme-editor.php, while hiding file editing submenus in the WordPress dashboard.",
    },
    {
      index: "05",
      question: "Can I assign freelance contractors with automatic access expiration?",
      answer:
        "Yes. Every project assignment includes an expiration timestamp (e.g. 7 days, 14 days, or custom). Once the time expires, all session grants are automatically revoked. Admins can also click 'Revoke Session' at any time to instantly expire a contractor's active WordPress session.",
    },
    {
      index: "06",
      question: "How do real-time notifications and desktop alerts work?",
      answer:
        "Vanguard uses a dual pipeline: in-app updates stream instantly over Server-Sent Events (SSE) with sound chimes and live unread counters. In addition, Firebase Cloud Messaging (FCM) delivers background desktop push notifications so developers and admins never miss urgent client tasks even when Vanguard is in another tab.",
    },
  ];

  return (
    <section id="faq" className="relative py-20 sm:py-28 bg-background border-t border-border/60">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Gojiberry Style Top Blueprint Pill */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="flex justify-center mb-4">
            <div className="relative inline-block">
              <CornerBrackets color="border-foreground/30" offset={-3} size={5} />
              <div className="inline-flex items-center gap-2 rounded-sm border border-border/80 bg-card px-3.5 py-1 text-xs font-mono font-medium text-foreground backdrop-blur-md shadow-2xs">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Technical Clarifications</span>
                <span className="text-border">&bull;</span>
                <span className="text-primary font-semibold">Architecture & FAQ</span>
              </div>
            </div>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-medium tracking-tight text-foreground leading-[1.15]">
            Frequently Asked Questions.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto font-normal">
            Everything you need to know about Vanguard&apos;s zero-plugin visual annotator and zero-trust WordPress access broker.
          </p>
        </div>

        {/* Accordion List Framed in Corner Brackets */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={faq.index}
                className={`group relative rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-primary/40 bg-card shadow-sm"
                    : "border-border/80 bg-card/60 hover:bg-card hover:border-border"
                }`}
              >
                {isOpen && (
                  <CornerBrackets color="border-primary/50" offset={-2} size={6} />
                )}

                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3.5 pr-4">
                    <span className="font-mono text-xs font-bold text-muted-foreground/80 group-hover:text-primary transition-colors">
                      {faq.index}
                    </span>
                    <span className="font-display text-sm sm:text-base font-semibold text-foreground">
                      {faq.question}
                    </span>
                  </div>

                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-secondary/50 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary border-primary/30" : ""
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pl-11">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
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
