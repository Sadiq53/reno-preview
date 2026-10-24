"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  KeyRound
} from "lucide-react";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const urlError = searchParams.get("error");
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(() => {
    if (urlError === "ACCOUNT_SUSPENDED" || urlError === "AccountSuspended") {
      return "Your account is currently suspended. Please contact your agency administrator.";
    }
    if (urlError === "ACCOUNT_DELETED") {
      return "This account has been permanently removed by an administrator.";
    }
    if (urlError === "SessionExpired") {
      return "Your session has expired or was revoked. Please sign in again.";
    }
    return "";
  });

  // Automatically redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const role = (session.user as any)?.role;
      const target =
        callbackUrl && callbackUrl !== "/" && !callbackUrl.includes("/login")
          ? callbackUrl
          : role === "DEVELOPER"
          ? "/developer"
          : "/admin";
      router.replace(target);
    }
  }, [status, session, callbackUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.toLowerCase().includes("suspend")) {
          setErrorMessage(res.error);
        } else {
          setErrorMessage("Invalid email or password. Please try again.");
        }
      } else {
        // Fetch current session to determine exact authenticated role reliably
        let destination = callbackUrl;
        if (!destination || destination === "/" || destination.includes("/login")) {
          try {
            const sessionRes = await fetch("/api/auth/session");
            const sessionData = await sessionRes.json();
            const role = sessionData?.user?.role;
            destination = role === "DEVELOPER" ? "/developer" : "/admin";
          } catch {
            destination = "/admin";
          }
        }
        router.push(destination);
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Brand Card Header with Vanguard Logo */}
      <div className="mb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="relative inline-flex items-center justify-center p-3 rounded-2xl bg-white border border-border shadow-xs hover:border-primary/40 transition-all">
            <Image
              src="/logo/vanguard-horizontal.png"
              alt="Crewvia Vanguard"
              width={220}
              height={44}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Agency Sign In
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Zero-Trust Access Broker & Visual Client Review Portal
        </p>
      </div>

      {/* Surface Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
        {errorMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agency.com"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 shadow-xs"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-muted-foreground">Minimum 8 characters</span>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Forgot password? (Recover with 2FA)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 py-2.5 px-4 text-xs sm:text-sm font-semibold text-primary-foreground shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Back Link */}
      <div className="mt-6 text-center">
        <button
          onClick={() => router.push("/")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          &larr; Return to Platform Home
        </button>
      </div>

      {/* 2FA Password Recovery Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
        onSuccess={() => {
          setErrorMessage("");
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12 ambient-canvas dot-grid">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
