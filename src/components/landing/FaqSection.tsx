"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const faqs = [
    {
      question: "Do we need to install any WordPress plugin on our client sites?",
      answer:
        "No, absolutely none. Vanguard operates entirely zero-plugin and zero-mu-plugin. The visual annotator previews websites via an interactive proxy iframe, and developer authentication uses an ephemeral server-to-server handshake against standard wp-login.php. Your client's production database remains 100% untouched and clean.",
    },
    {
      question: "How does Zero-Trust WordPress Login work without revealing master passwords?",
      answer:
        "Client master credentials are stored encrypted with AES-256-GCM in PostgreSQL. When an assigned developer clicks 'Launch WordPress', Vanguard completes a headless login handshake against wp-login.php in ephemeral RAM. A single-use 60-second grant token is dispatched directly to the Vanguard Companion Extension, which injects authenticated session cookies. The developer never sees, touches, or stores the master password.",
    },
    {
      question: "Can clients leave feedback and drop pins without creating an account?",
      answer:
        "Yes! You can generate scoped shareable preview links (/share/[token]) with either 'Viewer' (read-only inspection) or 'Commenter' permissions. Commenters simply enter their name once and can immediately click anywhere to drop pinpoint task markers, reply to threads, and inspect responsive viewports without friction.",
    },
    {
      question: "How does the Companion Extension protect client sites from unauthorized changes?",
      answer:
        "The Vanguard Companion Extension features a built-in capability sentinel. When a developer is logged in via a restricted grant, the extension intercepts and hard-blocks navigation to dangerous file editor endpoints like /wp-admin/plugin-editor.php and /wp-admin/theme-editor.php, while hiding file editing submenus in the WordPress dashboard.",
    },
    {
      question: "Can I assign freelance contractors with automatic access expiration?",
      answer:
        "Yes. Every project assignment includes an expiration timestamp (e.g. 7 days, 14 days, or custom). Once the time expires, all session grants are automatically revoked. Admins can also click 'Revoke Session' at any time to instantly expire a contractor's active WordPress session.",
    },
    {
      question: "How do real-time notifications and desktop alerts work?",
      answer:
        "Vanguard uses a dual pipeline: in-app updates stream instantly over Server-Sent Events (SSE) with sound chimes and live unread counters. In addition, Firebase Cloud Messaging (FCM) delivers background desktop push notifications so developers and admins never miss urgent client tasks even when Vanguard is in another tab.",
    },
  ];

  return (
    <section id="faq" className="relative py-20 sm:py-28 bg-secondary/20 border-t border-border/60">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Everything you need to know about Vanguard&apos;s zero-plugin visual annotator and zero-trust WordPress access broker.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-xs sm:text-sm font-bold text-foreground transition-colors hover:bg-secondary/40 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="font-display leading-tight">{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-muted-foreground border-t border-border/40 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
