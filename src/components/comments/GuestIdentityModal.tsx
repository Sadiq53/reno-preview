"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, X, Mail, User, Sparkles, ArrowRight } from "lucide-react";

export interface GuestIdentity {
  name: string;
  email?: string;
}

interface GuestIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (identity: GuestIdentity) => void;
  initialName?: string;
  initialEmail?: string;
}

const STORAGE_KEY = "vanguard_guest_identity";
const LEGACY_STORAGE_KEY = "reno_guest_identity";

export default function GuestIdentityModal({
  isOpen,
  onClose,
  onSubmit,
  initialName = "",
  initialEmail = "",
}: GuestIdentityModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Load saved identity from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
      }
    } catch {
      // LocalStorage access might be restricted in some sandboxed iframes
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter your name before dropping a comment");
      return;
    }

    if (rememberMe) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ name: trimmedName, email: email.trim() })
        );
        document.cookie = `vanguard_reviewer_name=${encodeURIComponent(trimmedName)}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {
        // LocalStorage fallback
      }
    }

    onSubmit({ name: trimmedName, email: email.trim() || undefined });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 border border-accent/40 text-accent-foreground shadow-xs">
              <UserCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground flex items-center gap-1.5">
                <span>Introduce Yourself</span>
                <Sparkles className="h-3.5 w-3.5 text-accent" />
              </h2>
              <p className="text-xs text-muted-foreground">
                Let the development team know who is leaving this feedback.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        {/* Identity Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Your Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="e.g. Sarah Jenkins"
                autoFocus
                className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Email Address <span className="text-muted-foreground text-[10px] lowercase font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sarah@clientbrand.com"
                className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 shadow-xs"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Used only to notify you when developers mark your feedback as resolved.
            </p>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input bg-background text-primary focus:ring-primary/30"
            />
            <label htmlFor="rememberMe" className="text-xs text-muted-foreground cursor-pointer select-none">
              Remember me in this browser for future comments
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Continue & Comment</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
