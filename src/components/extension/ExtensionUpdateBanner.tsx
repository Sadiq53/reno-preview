"use client";

import React, { useState, useEffect } from "react";
import { Download, Sparkles, X, ShieldAlert, ArrowUpRight } from "lucide-react";

interface ExtensionVersionData {
  latestVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
}

function compareSemver(v1: string, v2: string): number {
  const p1 = v1.split(".").map(Number);
  const p2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export default function ExtensionUpdateBanner() {
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [remoteData, setRemoteData] = useState<ExtensionVersionData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Fetch remote version metadata
    fetch("/api/extension/version")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ExtensionVersionData | null) => {
        if (data) {
          setRemoteData(data);
          const dismissedKey = `vanguard_dismissed_update_${data.latestVersion}`;
          const legacyDismissedKey = `reno_dismissed_update_${data.latestVersion}`;
          if (sessionStorage.getItem(dismissedKey) || sessionStorage.getItem(legacyDismissedKey)) {
            setIsDismissed(true);
          }
        }
      })
      .catch((err) => console.debug("[EXTENSION_CHECK_ERROR]:", err));

    // 2. Read installed version from DOM or wait for extension bridge signal
    const checkVersion = () => {
      const domVersion =
        document.documentElement.getAttribute("data-vanguard-extension-installed") ||
        document.documentElement.getAttribute("data-reno-extension-installed");
      if (domVersion && domVersion !== "true") {
        setInstalledVersion(domVersion);
      }
    };

    checkVersion();

    const handleReady = (e: any) => {
      if (e.detail?.version) {
        setInstalledVersion(e.detail.version);
      }
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.source !== window || !e.data) return;
      if (
        (e.data.type === "VANGUARD_EXTENSION_READY" ||
          e.data.type === "VANGUARD_PONG_EXTENSION" ||
          e.data.type === "RENO_EXTENSION_READY" ||
          e.data.type === "RENO_PONG_EXTENSION") &&
        e.data.version
      ) {
        setInstalledVersion(e.data.version);
      }
    };

    window.addEventListener("vanguard-extension-ready", handleReady);
    window.addEventListener("reno-extension-ready", handleReady);
    window.addEventListener("message", handleMessage);

    // Initial ping to probe installed version
    window.postMessage({ type: "VANGUARD_PING_EXTENSION" }, window.location.origin);
    window.postMessage({ type: "RENO_PING_EXTENSION" }, window.location.origin);

    return () => {
      window.removeEventListener("vanguard-extension-ready", handleReady);
      window.removeEventListener("reno-extension-ready", handleReady);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  if (!remoteData || !installedVersion || isDismissed) {
    return null;
  }

  const isOutdated = compareSemver(remoteData.latestVersion, installedVersion) > 0;
  if (!isOutdated) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem(`vanguard_dismissed_update_${remoteData.latestVersion}`, "true");
  };

  return (
    <div className="relative z-50 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-foreground backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-1">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <span className="font-semibold text-foreground">Extension Update Available: </span>
            <span className="text-muted-foreground">
              Vanguard Companion <strong>v{remoteData.latestVersion}</strong> is ready (you have v{installedVersion}).
            </span>
            {remoteData.releaseNotes && (
              <span className="hidden md:inline text-muted-foreground/80 ml-1.5 border-l border-border/80 pl-1.5 text-[11px]">
                {remoteData.releaseNotes}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={remoteData.downloadUrl}
            download={`crewvia-vanguard-companion-v${remoteData.latestVersion}.zip`}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1 text-xs shadow-xs transition-all active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Update (.zip)</span>
          </a>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
