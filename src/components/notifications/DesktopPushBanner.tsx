"use client";

import React, { useState } from "react";
import { Bell, X, ShieldCheck, Loader2 } from "lucide-react";
import { useNotifications } from "./NotificationContext";

export default function DesktopPushBanner() {
  const { showPushPrompt, pushPermission, requestPushPermission, dismissPushPrompt } =
    useNotifications();
  const [isActivating, setIsActivating] = useState(false);

  if (!showPushPrompt || pushPermission !== "default") {
    return null;
  }

  const handleEnable = async () => {
    setIsActivating(true);
    try {
      await requestPushPermission();
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] select-none animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />

        <div className="flex items-start gap-3.5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <Bell className="h-5 w-5 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <h4 className="text-xs font-bold font-display text-foreground tracking-tight">
                Enable Desktop Notifications
              </h4>
              <span className="rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.2 text-[9px] font-semibold">
                Instant Alerts
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground mb-3">
              Get background alerts when tasks are assigned to you or client feedback is submitted, even when Vanguard is in another tab.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={isActivating}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Enabling...</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-3.5 w-3.5" />
                    <span>Enable Notifications</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={dismissPushPrompt}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissPushPrompt}
            className="absolute top-3 right-3 text-muted-foreground/60 hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/80">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            Zero spam. Scoped strictly to your assigned projects.
          </span>
        </div>
      </div>
    </div>
  );
}
