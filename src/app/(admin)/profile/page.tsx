"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  User,
  Mail,
  ShieldCheck,
  Lock,
  LogOut,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Laptop,
  Palette,
  Loader2,
  Download,
  Send,
  Edit3,
  RefreshCw
} from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";
import AvatarPickerModal from "@/components/profile/AvatarPickerModal";
import EmailOtpModal from "@/components/profile/EmailOtpModal";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [hasExtension, setHasExtension] = useState(false);
  const [nickname, setNickname] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);
  const [isEmailOtpModalOpen, setIsEmailOtpModalOpen] = useState(false);
  const [isTesting2Fa, setIsTesting2Fa] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setNickname(session.user.name);
    }
    if (session?.user?.email) {
      setCurrentEmail(session.user.email);
    }
    if (session?.user?.image) {
      setCurrentAvatarUrl(session.user.image);
    }
  }, [session?.user?.name, session?.user?.email, session?.user?.image]);

  // Check extension presence in real-time
  useEffect(() => {
    const checkExt = () => {
      const installed =
        document.documentElement.getAttribute("data-vanguard-extension-installed") ||
        document.documentElement.getAttribute("data-reno-extension-installed");
      const ready =
        document.documentElement.getAttribute("data-vanguard-extension-ready") ||
        document.documentElement.getAttribute("data-reno-extension-ready");
      if (installed || ready === "true") {
        setHasExtension(true);
      }
    };
    checkExt();

    const handleReady = () => setHasExtension(true);
    const handleMsg = (e: MessageEvent) => {
      if (
        e.data?.type === "VANGUARD_PONG_EXTENSION" ||
        e.data?.type === "VANGUARD_EXTENSION_READY" ||
        e.data?.type === "RENO_PONG_EXTENSION" ||
        e.data?.type === "RENO_EXTENSION_READY"
      ) {
        setHasExtension(true);
      }
    };

    window.addEventListener("vanguard-extension-ready", handleReady);
    window.addEventListener("reno-extension-ready", handleReady);
    window.addEventListener("message", handleMsg);
    window.postMessage({ type: "VANGUARD_PING_EXTENSION" }, window.location.origin);
    window.postMessage({ type: "RENO_PING_EXTENSION" }, window.location.origin);

    const interval = setInterval(() => {
      checkExt();
      window.postMessage({ type: "VANGUARD_PING_EXTENSION" }, window.location.origin);
      window.postMessage({ type: "RENO_PING_EXTENSION" }, window.location.origin);
    }, 2000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("vanguard-extension-ready", handleReady);
      window.removeEventListener("reno-extension-ready", handleReady);
      window.removeEventListener("message", handleMsg);
    };
  }, []);

  const handleAvatarChange = async (newUrl: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: newUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update avatar");
      }

      setCurrentAvatarUrl(newUrl);
      if (updateSession) {
        await updateSession();
      }

      setStatusMessage({
        type: "success",
        text: "Profile avatar updated successfully across all views.",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save avatar",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setStatusMessage({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setIsUpdatingPassword(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setStatusMessage({
        type: "success",
        text: "Password updated successfully across all zero-trust sessions.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to change password",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || isUpdatingNickname) return;

    setIsUpdatingNickname(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update nickname");
      }

      if (updateSession) {
        await updateSession();
      }

      setStatusMessage({
        type: "success",
        text: `Nickname updated to "${nickname.trim()}". Team members and developers will see this name.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save nickname",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsUpdatingNickname(false);
    }
  };

  const handleTest2Fa = async () => {
    if (isTesting2Fa || !currentEmail) return;
    setIsTesting2Fa(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch 2FA test code");

      setStatusMessage({
        type: "success",
        text: `Test 2FA verification code dispatched to ${currentEmail}! Please check your inbox.`,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to dispatch 2FA test code",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsTesting2Fa(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
          <Sparkles className="h-3 w-3 text-accent" />
          <span>Account & Security Center</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          My Profile & Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Manage your executive administrator credentials, custom profile avatar, zero-trust browser companion status, and active sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm text-center">
            {/* Universal Avatar */}
            <div className="mx-auto flex flex-col items-center mb-4">
              <UserAvatar
                user={{
                  name: session?.user?.name,
                  avatarUrl: currentAvatarUrl || session?.user?.image,
                  email: session?.user?.email,
                }}
                size="2xl"
                withRing={true}
              />

              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary/40 cursor-pointer"
              >
                <Palette className="h-3.5 w-3.5 text-primary" />
                <span>Change Avatar</span>
              </button>
            </div>

            <h2 className="font-display text-lg font-bold text-foreground">
              {session?.user?.name || "Admin Owner"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {session?.user?.email || "admin@crewvia.agency"}
            </p>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Agency Administrator</span>
            </div>

            <div className="mt-6 pt-5 border-t border-border/80 flex flex-col gap-2">
              <Link
                href="/developer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card hover:bg-secondary py-2 px-3 text-xs font-semibold text-foreground transition-colors shadow-xs"
              >
                <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Developer Workspace</span>
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 py-2 px-3 text-xs font-semibold text-destructive transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out of Platform</span>
              </button>
            </div>
          </div>

          {/* Browser Companion Sentinel Status */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                  Companion Sentinel
                </h3>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  hasExtension ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {hasExtension ? (
                <span className="text-emerald-700 font-medium">
                  Crewvia Vanguard Companion extension is active in this browser. Direct cookie injection and runtime capability sentinel are fully enabled.
                </span>
              ) : (
                <span className="text-amber-700 font-medium">
                  Extension not detected in this browser session. Automatic reverse proxy gateway fallback is active.
                </span>
              )}
            </p>

            {hasExtension ? (
              <div className="mt-3.5 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Extension Verified & Active</span>
              </div>
            ) : (
              <a
                href="/api/extension/download"
                download="crewvia-vanguard-companion-v1.0.0.zip"
                className="mt-3.5 flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-3 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Extension (.zip)</span>
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Password & Security */}
        <div className="md:col-span-2 space-y-6">
          {statusMessage && (
            <div
              className={`flex items-center gap-2.5 rounded-xl border p-4 text-xs font-medium ${
                statusMessage.type === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Account Profile Form (Configurable Nickname & OTP Verified Email) */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-base font-bold text-foreground">
                Account Information
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Verified Account</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Personal agency account details used for developer assignment tracking, visual annotation signatures, and audit logs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Configurable Nickname / Display Name */}
              <form onSubmit={handleSaveNickname} className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Display Nickname
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Sadiq / Lead Owner"
                    className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs sm:text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Visible to team members
                  </span>
                  <button
                    type="submit"
                    disabled={isUpdatingNickname || !nickname.trim() || nickname.trim() === session?.user?.name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  >
                    {isUpdatingNickname ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Edit3 className="h-3 w-3" />
                    )}
                    <span>Save Nickname</span>
                  </button>
                </div>
              </form>

              {/* Primary Email with OTP Change */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Primary Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    disabled
                    value={currentEmail || session?.user?.email || "admin@crewvia.agency"}
                    className="w-full rounded-xl border border-input bg-secondary/50 py-2 pl-9 pr-3 text-xs sm:text-sm text-foreground shadow-xs cursor-not-allowed"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Requires 6-digit OTP
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEmailOtpModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-[11px] font-semibold text-primary transition-all active:scale-95 cursor-pointer"
                  >
                    <Mail className="h-3 w-3" />
                    <span>Change via OTP</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2FA & Password Recovery Notice Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display text-base font-bold text-foreground">
                  2FA & Password Recovery via Email
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-full px-2.5 py-0.5">
                Active & Enforced
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              If you ever lose or forget your account password, our zero-trust system enforces two-factor recovery by dispatching a single-use 6-digit cryptographic verification code directly to your verified email address (<strong className="text-foreground">{currentEmail}</strong>).
            </p>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground">Test Mail Deliverability</p>
                <p>Send a sample 2FA recovery code to verify your inbox receives transactional notices.</p>
              </div>

              <button
                type="button"
                disabled={isTesting2Fa || !currentEmail}
                onClick={handleTest2Fa}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isTesting2Fa ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Send className="h-3.5 w-3.5 text-primary" />
                )}
                <span>Send Test 2FA Dispatch</span>
              </button>
            </div>
          </div>

          {/* Password Reset Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <h3 className="font-display text-base font-bold text-foreground mb-1 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <span>Change Security Password</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              Ensure your account is protected with a strong passphrase containing uppercase, numbers, and symbols.
            </p>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  <span>{isUpdatingPassword ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        userName={session?.user?.name || "Admin Owner"}
        currentAvatarUrl={currentAvatarUrl || session?.user?.image}
        onSelectAvatar={handleAvatarChange}
      />

      {/* Email Change OTP Verification Modal */}
      <EmailOtpModal
        isOpen={isEmailOtpModalOpen}
        onClose={() => setIsEmailOtpModalOpen(false)}
        currentEmail={currentEmail || session?.user?.email || ""}
        onSuccess={(updatedEmail) => {
          setCurrentEmail(updatedEmail);
          updateSession?.();
          setStatusMessage({
            type: "success",
            text: `Work email successfully updated to ${updatedEmail}.`,
          });
        }}
      />
    </div>
  );
}
