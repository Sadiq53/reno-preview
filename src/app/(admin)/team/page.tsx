"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  FolderKanban, 
  KeyRound, 
  Trash2, 
  Copy, 
  Check, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Clock,
  Ban,
  X,
  AlertTriangle
} from "lucide-react";
import Portal from "@/components/layout/Portal";
import UserAvatar from "@/components/ui/UserAvatar";
import { Skeleton } from "@/components/ui/Skeleton";

interface DeveloperItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: "ACTIVE" | "SUSPENDED" | string;
  suspendedUntil?: string | null;
  suspendReason?: string | null;
  avatarUrl: string | null;
  createdAt: string;
  assignedProjectsCount: number;
  commentsCount: number;
  resolvedCount: number;
  assignments: Array<{
    id: string;
    expiresAt: string;
    revokedAt: string | null;
    wpRoleTemplate: string;
    project: {
      id: string;
      name: string;
      clientName: string;
      targetUrl: string;
    };
  }>;
}

export default function TeamRosterPage() {
  const [developers, setDevelopers] = useState<DeveloperItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Suspend modal state
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendingDev, setSuspendingDev] = useState<DeveloperItem | null>(null);
  const [suspendDuration, setSuspendDuration] = useState<string>("24h");
  const [suspendReason, setSuspendReason] = useState<string>("");
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // One-time password modal state
  const [createdCredentials, setCreatedCredentials] = useState<{
    id?: string;
    email: string;
    name: string;
    password: string;
    isReset?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSendingCredsMail, setIsSendingCredsMail] = useState(false);
  const [credsMailSent, setCredsMailSent] = useState(false);
  const [credsMailMessage, setCredsMailMessage] = useState("");

  const fetchDevelopers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setDevelopers(data.developers || []);
      } else {
        setErrorMessage("Failed to fetch developers");
      }
    } catch (err) {
      setErrorMessage("Network error loading team roster");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    setIsInviting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName, email: inviteEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to invite developer");
      }

      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setCredsMailSent(false);
      setCredsMailMessage("");
      setCreatedCredentials({
        id: data.developer.id,
        name: data.developer.name,
        email: data.developer.email,
        password: data.oneTimePassword,
      });

      fetchDevelopers();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleResetPassword = async (dev: DeveloperItem) => {
    if (!confirm(`Reset credentials for ${dev.name}? A new temporary password will be generated.`)) return;

    try {
      const res = await fetch(`/api/team/${dev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: true }),
      });

      const data = await res.json();
      if (res.ok && data.newPassword) {
        setCredsMailSent(false);
        setCredsMailMessage("");
        setCreatedCredentials({
          id: dev.id,
          name: dev.name,
          email: dev.email,
          password: data.newPassword,
          isReset: true,
        });
      }
    } catch (err) {
      console.error("Failed to reset password:", err);
    }
  };

  const handleOpenSuspend = (dev: DeveloperItem) => {
    setSuspendingDev(dev);
    setSuspendDuration("24h");
    setSuspendReason("");
    setIsSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendingDev) return;

    setIsSubmittingSuspend(true);
    try {
      const res = await fetch(`/api/team/${suspendingDev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUSPEND",
          duration: suspendDuration,
          reason: suspendReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to suspend developer");
      }

      setIsSuspendModalOpen(false);
      setSuspendingDev(null);
      fetchDevelopers();
    } catch (err: any) {
      alert(err.message || "Failed to suspend developer");
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  const handleReactivate = async (dev: DeveloperItem) => {
    if (!confirm(`Reactivate account for ${dev.name}? They will regain login access and can be assigned projects again.`)) return;

    try {
      const res = await fetch(`/api/team/${dev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REACTIVATE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reactivate developer");
      }

      fetchDevelopers();
    } catch (err: any) {
      alert(err.message || "Failed to reactivate developer");
    }
  };

  const handleDeleteDeveloper = async (dev: DeveloperItem) => {
    if (!confirm(`Permanently delete ${dev.name} from the agency database? If they are currently logged in, their session will be immediately terminated and logged out.`)) return;

    try {
      const res = await fetch(`/api/team/${dev.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDevelopers((prev) => prev.filter((d) => d.id !== dev.id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to remove developer");
      }
    } catch (err) {
      console.error("Failed to delete developer:", err);
    }
  };

  const handleCopyCredentials = () => {
    if (createdCredentials) {
      const text = `Crewvia Vanguard Login Credentials:\nPortal URL: ${window.location.origin}/login\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const filteredDevelopers = developers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center pb-4 border-b border-border/60">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Developer Team Roster
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Onboard contractors, assign them to client projects with auto-expiry dates, and generate zero-trust credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchDevelopers}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Invite Developer</span>
          </button>
        </div>
      </div>

        {errorMessage && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search developers by name or email..."
              className="w-full rounded-xl border border-input bg-card py-2 pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25 shadow-xs transition-colors"
            />
          </div>
        </div>

        {/* Developer Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3 w-40 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24 rounded-md" />
                    <Skeleton className="h-3 w-6 rounded-md" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <Skeleton className="h-7 w-20 rounded-lg" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-lg" />
                    <Skeleton className="h-7 w-7 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredDevelopers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card shadow-xs">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="font-display text-base font-bold text-foreground">No developers found</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Invite your first freelancer or team member to grant them scoped project access.
            </p>
            <div className="mt-5">
              <button
                onClick={() => setIsInviteOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Invite First Developer</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDevelopers.map((dev) => (
              <div
                key={dev.id}
                className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div>
                  {/* Avatar & User Info */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        user={{
                          name: dev.name,
                          avatarUrl: dev.avatarUrl,
                          email: dev.email,
                          status: dev.status,
                        }}
                        size="lg"
                        withRing={true}
                        showStatusIndicator={true}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-bold text-foreground truncate">{dev.name}</h3>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                          <Mail className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                          <span className="truncate">{dev.email}</span>
                        </span>
                      </div>
                    </div>

                    {dev.status === "SUSPENDED" ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive border border-destructive/30 shrink-0 flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        <span>SUSPENDED</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20 shrink-0">
                        Developer
                      </span>
                    )}
                  </div>

                  {/* Suspension Warning Box if Suspended */}
                  {dev.status === "SUSPENDED" && (
                    <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Suspended {dev.suspendedUntil ? `until ${new Date(dev.suspendedUntil).toLocaleDateString()}` : "Indefinitely"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        {dev.suspendReason || "All active project assignments and login sessions are blocked."}
                      </p>
                    </div>
                  )}

                  {/* Active Assignments Overview */}
                  <div className="mb-5 rounded-xl border border-border/80 bg-muted/30 p-3.5">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Assigned Projects</span>
                      <span className="font-display font-bold text-foreground">
                        {dev.status === "SUSPENDED" ? 0 : dev.assignedProjectsCount}
                      </span>
                    </div>

                    {dev.status === "SUSPENDED" ? (
                      <p className="text-[11px] text-destructive/80 italic font-medium">Access revoked due to suspension</p>
                    ) : dev.assignments.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">No active site assignments</p>
                    ) : (
                      <div className="space-y-1.5">
                        {dev.assignments.slice(0, 3).map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-foreground truncate max-w-[170px] font-medium">
                              {a.project.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {a.wpRoleTemplate.toLowerCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                  {dev.status === "SUSPENDED" ? (
                    <button
                      onClick={() => handleReactivate(dev)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 px-3 text-xs font-semibold text-white transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Reactivate Account</span>
                    </button>
                  ) : (
                    <>
                      <Link
                        href={`/admin/projects`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-card py-2 px-3 text-xs font-semibold text-foreground border border-border/80 hover:bg-secondary transition-colors shadow-xs"
                      >
                        <FolderKanban className="h-3.5 w-3.5 text-primary" />
                        <span>Assign Project</span>
                      </Link>

                      <button
                        onClick={() => handleResetPassword(dev)}
                        className="p-2 rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-xs cursor-pointer"
                        title="Generate New Password"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenSuspend(dev)}
                        className="p-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-colors shadow-xs cursor-pointer"
                        title="Suspend Developer Account"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDeleteDeveloper(dev)}
                    className="p-2 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors shadow-xs cursor-pointer"
                    title="Permanently Delete Account"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INVITE DEVELOPER MODAL */}
        {isInviteOpen && (
          <Portal>
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setIsInviteOpen(false)}>
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Invite Developer / Contractor</h2>
              <p className="text-xs text-muted-foreground mb-5">
                A secure temporary password will be auto-generated for them to sign in.
              </p>

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full rounded-xl border border-input bg-background py-2 px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. alex@freelance.dev"
                    className="w-full rounded-xl border border-input bg-background py-2 px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/80">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isInviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>Create Account</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
          </Portal>
        )}

        {/* ONE-TIME CREDENTIALS REVELATION MODAL */}
        {createdCredentials && (
          <Portal>
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-emerald-300 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 text-emerald-700 mb-2">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {createdCredentials.isReset ? "Password Reset Complete" : "Developer Account Created"}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-foreground mb-2">
                Temporary Login Credentials
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Share these temporary credentials with <strong className="text-foreground">{createdCredentials.name}</strong>. They will use these to log into the Developer Portal.
              </p>

              <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-2 mb-5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">Portal URL</span>
                  <code className="text-xs text-foreground font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/login</code>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">Email</span>
                  <code className="text-xs text-foreground font-mono">{createdCredentials.email}</code>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">Temporary Password</span>
                  <code className="text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-mono font-bold select-all">{createdCredentials.password}</code>
                </div>
              </div>

              {credsMailMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{credsMailMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCredentials}
                    className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={async () => {
                      if (!createdCredentials?.id || !createdCredentials?.password) return;
                      setIsSendingCredsMail(true);
                      try {
                        const res = await fetch("/api/team/send-credentials", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            developerId: createdCredentials.id,
                            password: createdCredentials.password,
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setCredsMailSent(true);
                          setCredsMailMessage(data.message || "Credentials dispatched via email!");
                        } else {
                          alert(data.error || "Failed to dispatch email");
                        }
                      } catch {
                        alert("Network error sending email");
                      } finally {
                        setIsSendingCredsMail(false);
                      }
                    }}
                    disabled={isSendingCredsMail || credsMailSent}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                      credsMailSent
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {isSendingCredsMail ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : credsMailSent ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Emailed via Brevo</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-3.5 w-3.5" />
                        <span>Send via Email</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-95 cursor-pointer ml-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
          </Portal>
        )}

        {/* SUSPEND DEVELOPER MODAL */}
        {isSuspendModalOpen && suspendingDev && (
          <Portal>
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
              onClick={() => !isSubmittingSuspend && setIsSuspendModalOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      user={suspendingDev}
                      size="md"
                      withRing={false}
                    />
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">
                        Suspend Developer
                      </h2>
                      <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                        {suspendingDev.name} &bull; {suspendingDev.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsSuspendModalOpen(false)}
                    disabled={isSubmittingSuspend}
                    className="p-1.5 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Zero-Trust Enforcement:</strong> Suspending will immediately invalidate this developer's active session, revoke all active project assignments, and send an official suspension notification email via Brevo.
                  </div>
                </div>

                <form onSubmit={handleConfirmSuspend} className="space-y-4">
                  {/* Duration Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Suspension Duration</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "24h", label: "24 Hours" },
                        { id: "3d", label: "3 Days" },
                        { id: "7d", label: "7 Days" },
                        { id: "30d", label: "30 Days" },
                        { id: "permanent", label: "Permanent" },
                      ].map((dur) => (
                        <button
                          key={dur.id}
                          type="button"
                          onClick={() => setSuspendDuration(dur.id)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                            suspendDuration === dur.id
                              ? "border-destructive bg-destructive text-destructive-foreground shadow-xs"
                              : "border-border/80 bg-secondary/50 text-foreground hover:bg-secondary"
                          }`}
                        >
                          {dur.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason Text */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Suspension Reason (Included in email)
                    </label>
                    <textarea
                      rows={3}
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="e.g. Temporary contract pause for security review..."
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-destructive/25 resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmittingSuspend}
                      onClick={() => setIsSuspendModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-border/80 bg-card hover:bg-secondary text-xs font-semibold text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingSuspend}
                      className="inline-flex items-center gap-2 rounded-xl bg-destructive hover:bg-destructive/90 px-4 py-2 text-xs font-semibold text-destructive-foreground shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingSuspend ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Suspending...</span>
                        </>
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5" />
                          <span>Confirm Suspension</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Portal>
        )}
    </div>
  );
}
