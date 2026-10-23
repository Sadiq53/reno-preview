"use client";

import React, { useState } from "react";
import {
  Mail,
  ShieldCheck,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  RefreshCw
} from "lucide-react";

interface EmailOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSuccess: (newEmail: string) => void;
}

export default function EmailOtpModal({
  isOpen,
  onClose,
  currentEmail,
  onSuccess,
}: EmailOtpModalProps) {
  const [step, setStep] = useState<"INPUT_EMAIL" | "ENTER_OTP">("INPUT_EMAIL");
  const [newEmail, setNewEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || isLoading) return;

    if (newEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      setErrorMessage("New email address cannot be identical to your current email.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessNotice("");

    try {
      const res = await fetch("/api/profile/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch verification code.");
      }

      setSuccessNotice(data.message || `Verification code sent to ${newEmail}`);
      setStep("ENTER_OTP");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || isLoading) return;

    if (otpCode.trim().length !== 6) {
      setErrorMessage("Please enter the full 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/profile/email-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: newEmail.trim(),
          otp: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      onSuccess(newEmail.trim());
      handleClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isLoading || !newEmail) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessNotice("");

    try {
      const res = await fetch("/api/profile/email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code.");
      setSuccessNotice(`New verification code sent to ${newEmail}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("INPUT_EMAIL");
    setNewEmail("");
    setOtpCode("");
    setErrorMessage("");
    setSuccessNotice("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              {step === "INPUT_EMAIL" ? "Update Primary Email" : "Verify Email with OTP"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {step === "INPUT_EMAIL"
                ? "Enter your new work email to receive a secure 6-digit code"
                : `Enter the 6-digit code dispatched to ${newEmail}`}
            </p>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="my-3.5 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Notice */}
        {successNotice && (
          <div className="my-3.5 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* STEP 1: Enter New Email */}
        {step === "INPUT_EMAIL" ? (
          <form onSubmit={handleRequestOtp} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Current Email Address
              </label>
              <input
                type="email"
                disabled
                value={currentEmail}
                className="w-full rounded-xl border border-input bg-secondary/50 py-2 px-3 text-xs text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                New Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin-new@youragency.com"
                  className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Zero-Trust Verification:</span> An automated 6-digit cryptographic OTP will be sent to the new email address via Brevo to ensure you have full access before updating.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !newEmail.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: Enter 6-digit OTP */
          <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 text-center">
                Enter 6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-bold rounded-xl border border-input bg-background py-3 px-4 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                Code expires in 10 minutes &bull; Checked via timing-safe comparison
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep("INPUT_EMAIL")}
                className="text-muted-foreground hover:text-foreground text-[11px] underline cursor-pointer"
              >
                Change email address
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleResend}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Resend Code</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Verify & Update Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
