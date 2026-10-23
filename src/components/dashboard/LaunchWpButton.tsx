"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Puzzle,
  AlertTriangle,
  Globe,
  Sparkles,
  CheckCircle2,
  Download,
  X
} from "lucide-react";
import Portal from "@/components/layout/Portal";

interface LaunchWpButtonProps {
  projectId: string;
  projectName: string;
  targetUrl?: string;
  assignmentId?: string;
  allowExtensionLogin?: boolean;
  allowProxyLogin?: boolean;
  isConfigured?: boolean;
  variant?: "primary" | "compact" | "outline";
  className?: string;
}

export function LaunchWpButton({
  projectId,
  projectName,
  targetUrl,
  assignmentId,
  allowExtensionLogin = true,
  allowProxyLogin = false,
  isConfigured = true,
  variant = "primary",
  className = "",
}: LaunchWpButtonProps) {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const missedPingsRef = useRef(0);
  const checkInFlightRef = useRef(false);
  const autoLaunchedRef = useRef(false);

  const isDeveloperMode = Boolean(assignmentId);

  // 1. Check Session Cookies via Extension Bridge
  const checkSessionStatus = useCallback(() => {
    if (checkInFlightRef.current) return;
    checkInFlightRef.current = true;

    const requestId = `check_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const handleStatusResponse = (event: MessageEvent) => {
      if (
        event.source === window &&
        (event.data?.type === "VANGUARD_SESSION_STATUS_RESPONSE" ||
          event.data?.type === "RENO_SESSION_STATUS_RESPONSE") &&
        event.data?.requestId === requestId
      ) {
        checkInFlightRef.current = false;
        window.removeEventListener("message", handleStatusResponse);
        if (event.data?.hasActiveSession) {
          setHasActiveSession(true);
        } else {
          setHasActiveSession(false);
        }
      }
    };

    window.addEventListener("message", handleStatusResponse);

    window.postMessage(
      {
        type: "VANGUARD_CHECK_SESSION_STATUS",
        requestId,
        targetUrl,
        assignmentId,
      },
      window.location.origin
    );

    setTimeout(() => {
      checkInFlightRef.current = false;
      window.removeEventListener("message", handleStatusResponse);
    }, 2000);
  }, [targetUrl, assignmentId]);

  // 2. Real-Time Extension Detection Engine (No Page Reload Needed)
  useEffect(() => {
    // A. Check DOM attribute set by content-bridge.js
    const checkDomAttribute = () => {
      const isInstalled =
        document.documentElement.getAttribute("data-vanguard-extension-installed") ||
        document.documentElement.getAttribute("data-reno-extension-installed");
      if (isInstalled) {
        setIsExtensionInstalled(true);
        missedPingsRef.current = 0;
        checkSessionStatus();
      }
    };
    checkDomAttribute();

    // B. MutationObserver on documentElement attributes for instant zero-latency detection
    const observer = new MutationObserver(() => {
      const isInstalled =
        document.documentElement.getAttribute("data-vanguard-extension-installed") ||
        document.documentElement.getAttribute("data-reno-extension-installed");
      if (isInstalled) {
        setIsExtensionInstalled(true);
        missedPingsRef.current = 0;
        checkSessionStatus();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-vanguard-extension-installed",
        "data-vanguard-extension-ready",
        "data-reno-extension-installed",
        "data-reno-extension-ready",
      ],
    });

    // C. Event listener for extension-ready custom event
    const handleExtensionReady = () => {
      setIsExtensionInstalled(true);
      missedPingsRef.current = 0;
      checkSessionStatus();
    };
    window.addEventListener("vanguard-extension-ready", handleExtensionReady);
    window.addEventListener("reno-extension-ready", handleExtensionReady);

    // D. Window message listener for extension signals
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;

      if (
        (event.data.type === "VANGUARD_PONG_EXTENSION" ||
          event.data.type === "VANGUARD_EXTENSION_READY" ||
          event.data.type === "RENO_PONG_EXTENSION" ||
          event.data.type === "RENO_EXTENSION_READY") &&
        event.data.installed
      ) {
        setIsExtensionInstalled(true);
        missedPingsRef.current = 0;
        checkSessionStatus();
      }
    };
    window.addEventListener("message", handleWindowMessage);

    // E. Heartbeat Ping Loop (every 1.2s) - guarantees live detection when user enables/disables extension
    const pingExtension = () => {
      const pingId = `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      window.postMessage({ type: "VANGUARD_PING_EXTENSION", requestId: pingId }, window.location.origin);
      window.postMessage({ type: "RENO_PING_EXTENSION", requestId: pingId }, window.location.origin);

      // Increment missed pings; if 4 unanswered in a row, consider extension disconnected
      missedPingsRef.current += 1;
      if (missedPingsRef.current > 4) {
        setIsExtensionInstalled(false);
        setHasActiveSession(false);
      }
    };

    const pingInterval = setInterval(pingExtension, 1200);
    pingExtension(); // Initial ping

    // F. Instant detection on window focus or visibility change (when returning from chrome://extensions)
    const handleFocus = () => {
      missedPingsRef.current = 0;
      checkDomAttribute();
      pingExtension();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      observer.disconnect();
      clearInterval(pingInterval);
      window.removeEventListener("reno-extension-ready", handleExtensionReady);
      window.removeEventListener("message", handleWindowMessage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [checkSessionStatus]);

  // 3. Direct Instant Open (When valid session cookies exist)
  const handleDirectOpen = async () => {
    setIsLaunching(true);
    setLaunchStatus("Opening WP Admin Panel...");
    setErrorMessage(null);

    const requestId = `open_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const handleOpenResponse = (event: MessageEvent) => {
      if (
        event.source === window &&
        (event.data?.type === "VANGUARD_OPEN_WP_ADMIN_RESPONSE" ||
          event.data?.type === "RENO_OPEN_WP_ADMIN_RESPONSE") &&
        event.data?.requestId === requestId
      ) {
        window.removeEventListener("message", handleOpenResponse);
        setLaunchStatus(null);
        setIsLaunching(false);
      }
    };

    window.addEventListener("message", handleOpenResponse);

    window.postMessage(
      {
        type: "VANGUARD_OPEN_WP_ADMIN",
        requestId,
        targetUrl,
      },
      window.location.origin
    );

    // Fallback: If no response in 1.2s, assume tab focused
    setTimeout(() => {
      window.removeEventListener("message", handleOpenResponse);
      setLaunchStatus(null);
      setIsLaunching(false);
    }, 1200);
  };

  // 4. Fresh Login Handshake (When extension exists but no active session cookies)
  const handleFreshLogin = async (mode: "auto" | "extension" | "proxy" = "auto") => {
    setIsLaunching(true);
    setErrorMessage(null);

    // If proxy mode is explicitly requested or proxy-only is allowed without extension
    if (mode === "proxy" || (!isExtensionInstalled && allowProxyLogin && !allowExtensionLogin)) {
      setLaunchStatus("Opening via Reverse Proxy Gateway...");
      const proxyUrl = `/api/proxy/${projectId}/wp-admin`;
      window.open(proxyUrl, "_blank");
      setLaunchStatus(null);
      setIsLaunching(false);
      return;
    }

    // Zero-Trust Extension Mode: requires companion extension
    if (!isExtensionInstalled) {
      setShowInstallModal(true);
      setIsLaunching(false);
      setLaunchStatus(null);
      return;
    }

    setLaunchStatus("Connecting to zero-trust broker...");

    try {
      // Step 1: Request 60s single-use grant token from Broker
      const res = await fetch("/api/broker/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, assignmentId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate zero-trust session grant.");
      }

      const { grantToken, targetUrl: resolvedTargetUrl } = data;

      // Step 2: Inject session cookies via extension
      setLaunchStatus("Injecting native session cookies...");
      const requestId = `launch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let resolved = false;

      const responsePromise = new Promise<{ success: boolean; error?: string }>((resolve) => {
        const handleResponse = (event: MessageEvent) => {
          if (
            event.source === window &&
            (event.data?.type === "VANGUARD_LAUNCH_WP_RESPONSE" ||
              event.data?.type === "RENO_LAUNCH_WP_RESPONSE") &&
            event.data?.requestId === requestId
          ) {
            resolved = true;
            window.removeEventListener("message", handleResponse);
            resolve(event.data);
          }
        };

        window.addEventListener("message", handleResponse);

        // 12-second generous timeout for network handshake
        setTimeout(() => {
          if (!resolved) {
            window.removeEventListener("message", handleResponse);
            resolve({
              success: false,
              error: "Extension response timed out. Please ensure Crewvia Vanguard Companion extension is active.",
            });
          }
        }, 12000);
      });

      // Dispatch token to extension content bridge
      window.postMessage(
        {
          type: "VANGUARD_LAUNCH_WP_SESSION",
          requestId,
          grantToken,
          assignmentId,
          brokerUrl: window.location.origin,
          targetUrl: resolvedTargetUrl || targetUrl,
        },
        window.location.origin
      );

      const extensionResult = await responsePromise;

      if (extensionResult.success) {
        setHasActiveSession(true);
        setLaunchStatus("Authenticated! Opening WP Admin...");
        setTimeout(() => {
          setLaunchStatus(null);
          setIsLaunching(false);
        }, 1200);
      } else {
        if (isDeveloperMode || !allowProxyLogin) {
          setErrorMessage(
            extensionResult.error ||
              "Extension launch failed. Please ensure the Reno Access Companion extension is active."
          );
          setIsLaunching(false);
          setLaunchStatus(null);
        } else {
          console.warn("[RENO_HUB] Extension launch failed, using proxy fallback:", extensionResult.error);
          setLaunchStatus("Opening via Proxy Gateway fallback...");
          window.open(`/api/proxy/${projectId}/wp-admin`, "_blank");
          setTimeout(() => {
            setLaunchStatus(null);
            setIsLaunching(false);
          }, 800);
        }
      }
    } catch (err: any) {
      console.error("[LAUNCH_ERROR]", err);
      setErrorMessage(err.message || "Could not launch WordPress Admin.");
      setIsLaunching(false);
      setLaunchStatus(null);
    }
  };

  // 5. Unified Smart Click Handler (No dropdown needed)
  const handleButtonClick = () => {
    // Case A: Extension installed AND active session exists -> Open panel directly in new tab
    if (isExtensionInstalled && hasActiveSession) {
      handleDirectOpen();
      return;
    }

    // Case B: Extension installed, but no session -> Auto login and open in new tab
    if (isExtensionInstalled) {
      handleFreshLogin("extension");
      return;
    }

    // Case C: Extension not installed
    // If proxy-only is configured for this project
    if (allowProxyLogin && !allowExtensionLogin) {
      handleFreshLogin("proxy");
      return;
    }

    // Otherwise show guidance popup
    setShowInstallModal(true);
  };

  // Auto-launch trigger when extension becomes active while install modal is open
  useEffect(() => {
    if (showInstallModal && isExtensionInstalled && !autoLaunchedRef.current) {
      autoLaunchedRef.current = true;
      const timer = setTimeout(() => {
        setShowInstallModal(false);
        handleFreshLogin("extension");
      }, 700);
      return () => clearTimeout(timer);
    }
    if (!showInstallModal) {
      autoLaunchedRef.current = false;
    }
  }, [showInstallModal, isExtensionInstalled]);

  if (!isConfigured) {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          disabled
          title="WordPress credentials haven't been configured by the agency owner yet"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold bg-secondary/60 text-muted-foreground border border-border/70 cursor-not-allowed opacity-60 shadow-none select-none"
        >
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span>Login to WP Admin</span>
          <span className="ml-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground border border-border/60">
            Credentials Pending
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Unified Robust Button (No Dropdown) */}
      <button
        onClick={handleButtonClick}
        disabled={isLaunching}
        title={
          hasActiveSession
            ? "WordPress session active! Click to open or switch to WP Admin panel."
            : isExtensionInstalled
            ? "1-Click zero-trust login into WP Admin via Crewvia Vanguard Companion."
            : "Crewvia Vanguard Companion extension required to access WP Admin."
        }
        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-xs cursor-pointer ${
          variant === "primary"
            ? hasActiveSession
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95"
              : isExtensionInstalled
              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md active:scale-95"
              : "bg-card text-foreground border border-border/80 hover:bg-secondary hover:border-foreground/20 active:scale-95"
            : "bg-card text-foreground border border-border/80 hover:bg-secondary"
        }`}
      >
        {isLaunching ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-current" />
        ) : hasActiveSession ? (
          <ExternalLink className="h-3.5 w-3.5 text-white" />
        ) : isExtensionInstalled ? (
          <KeyRound className="h-3.5 w-3.5 text-primary-foreground" />
        ) : (
          <Puzzle className="h-3.5 w-3.5 text-amber-600" />
        )}

        <span>
          {launchStatus
            ? launchStatus
            : hasActiveSession
            ? "Open WP Admin Panel"
            : isExtensionInstalled
            ? "Login to WP Admin"
            : "Login to WP Admin"}
        </span>

        {/* Real-time Glowing Pulsing Indicator for Active Session */}
        {hasActiveSession && !isLaunching && (
          <span className="relative flex h-2 w-2 ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-xs" />
          </span>
        )}

        {/* Companion Active Badge when extension installed but not logged in */}
        {!hasActiveSession && isExtensionInstalled && !isLaunching && (
          <span className="ml-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
            Ready
          </span>
        )}
      </button>

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="absolute left-0 mt-2 w-80 rounded-xl border border-destructive/30 bg-card p-3 shadow-2xl backdrop-blur-md z-50 text-xs text-destructive animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">Notice</div>
                <div className="mt-0.5 text-destructive text-[11px] leading-relaxed">{errorMessage}</div>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Extension Guidance Modal with Real-Time Auto-Detection */}
      {showInstallModal && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setShowInstallModal(false)}>
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                  <Puzzle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Crewvia Vanguard Companion</h3>
                  <p className="text-xs text-muted-foreground">Zero-Plugin Browser Extension (Manifest V3)</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-foreground/80 leading-relaxed mb-6">
              <p>
                To access <strong>{projectName}</strong> without disclosing client master passwords, the <strong>Crewvia Vanguard Companion</strong> extension must be active in your browser.
              </p>

              {/* Real-Time Detection Status Banner */}
              <div
                className={`flex items-center gap-2.5 rounded-xl border p-3 transition-all ${
                  isExtensionInstalled
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {isExtensionInstalled ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-950">
                      Extension Detected in Real-Time! Connecting...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <span className="text-[11px] leading-snug">
                      Listening for extension in background... Turn it ON in <code>chrome://extensions</code> (No page reload required).
                    </span>
                  </>
                )}
              </div>

              {/* Direct 1-Click Extension Download Card */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                    <Download className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-xs">Vanguard Companion Extension</div>
                    <div className="text-[11px] text-muted-foreground">Version 1.0.0 • Manifest V3 • Zero plugins required</div>
                  </div>
                </div>
                <a
                  href="/api/extension/download"
                  download="crewvia-vanguard-companion-v1.0.0.zip"
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .zip</span>
                </a>
              </div>

              {/* 3 Step Installation Guidance */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2.5 text-foreground">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    1
                  </span>
                  <span>
                    Click <strong>Download .zip</strong> above and extract the folder on your computer.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    2
                  </span>
                  <span>
                    Open <strong className="text-foreground font-mono">chrome://extensions</strong> (or <strong className="text-foreground font-mono">edge://extensions</strong>) and toggle <strong>Developer mode</strong> ON in top right.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    3
                  </span>
                  <span>
                    Click <strong>Load unpacked</strong> and select the unzipped extension directory. This page will connect automatically!
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-950 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Trust Guaranteed</strong>: Injects temporary session cookies into Chrome. Never reveals master passwords and automatically expires when access is revoked.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/80">
              {/* Optional proxy fallback button if admin explicitly enabled it */}
              {allowProxyLogin && !isDeveloperMode ? (
                <button
                  onClick={() => {
                    setShowInstallModal(false);
                    handleFreshLogin("proxy");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer shadow-xs"
                >
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span>Use Proxy Fallback</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => {
                  if (isExtensionInstalled) {
                    setShowInstallModal(false);
                    handleFreshLogin("extension");
                  } else {
                    setShowInstallModal(false);
                  }
                }}
                className="rounded-xl bg-primary hover:bg-primary/90 px-5 py-2 text-xs font-semibold text-white transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isExtensionInstalled ? "Launch Now" : "Got It"}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
