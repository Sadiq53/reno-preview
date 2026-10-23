"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  Sparkles
} from "lucide-react";
import Portal from "@/components/layout/Portal";

interface CredentialVaultModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function CredentialVaultModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSaved,
}: CredentialVaultModalProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [maskedUsername, setMaskedUsername] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch current vault status
  const fetchVaultStatus = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}/vault`);
      if (res.ok) {
        const data = await res.json();
        setTargetUrl(data.targetUrl || "");
        setIsConfigured(data.isConfigured || false);
        setMaskedUsername(data.maskedUsername || "");
        setLastUpdated(data.lastUpdated || null);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load vault status.");
      }
    } catch {
      setErrorMessage("Network error fetching vault configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVaultStatus();
      setUsername("");
      setPassword("");
      setSuccessMessage("");
      setErrorMessage("");
    }
  }, [isOpen, projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Both username and password are required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/vault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpAdminUsername: username.trim(),
          wpAdminPassword: password.trim(),
          targetUrl: targetUrl.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage("Credentials encrypted with AES-256-GCM and stored securely.");
        setIsConfigured(true);
        setPassword("");
        setUsername("");
        fetchVaultStatus();
        onSaved?.();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(data.error || "Failed to save credentials.");
      }
    } catch {
      setErrorMessage("Network error saving credentials to vault.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurge = async () => {
    if (!confirm(`Are you sure you want to permanently delete the stored WordPress master credentials for ${projectName}? Zero-trust developer launches will be disabled until reconfigured.`)) {
      return;
    }

    setIsPurging(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/vault`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage("Credentials purged from vault.");
        setIsConfigured(false);
        setMaskedUsername("");
        fetchVaultStatus();
        onSaved?.();
      } else {
        setErrorMessage(data.error || "Failed to purge credentials.");
      }
    } catch {
      setErrorMessage("Network error purging credentials.");
    } finally {
      setIsPurging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 p-5 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>Agency Credential Vault</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 border border-emerald-300">
                  AES-256-GCM
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">Project: {projectName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Security Banner */}
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 flex items-start gap-3 text-xs text-emerald-950">
            <Lock className="h-4 w-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-emerald-900 font-semibold">Zero-Disclosure Guarantee:</strong> Plaintext credentials exist in server RAM only for the 1-second login handshake against <code>wp-login.php</code>. They are never transmitted to contractors or rendered in HTML DOM.
            </div>
          </div>

          {/* Current Vault Status */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold">Vault Status:</span>
              {isLoading ? (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" /> Checking...
                </span>
              ) : isConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  Active in Vault (User: {maskedUsername || "Configured"})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  Not Configured (Required for 1-Click Launch)
                </span>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-100 p-3 text-xs text-emerald-900">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-700" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Credential Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Target Website URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://client.com"
                  required
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                WordPress Administrator Username or Email
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isConfigured ? "Enter new username to update..." : "admin_user or agency@client.com"}
                  required
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                WordPress Administrator Master Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isConfigured ? "Enter new master password to update..." : "••••••••••••••••"}
                  required
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Zero-trust guarantee: This password will be immediately encrypted using AES-256-GCM.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              {isConfigured ? (
                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={isPurging}
                  className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isPurging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  <span>Purge Vault</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border/80 bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer shadow-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  <span>Save to Secure Vault</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Portal>
  );
}
