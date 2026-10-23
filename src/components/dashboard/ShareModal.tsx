"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Share2,
  X,
  Copy,
  Check,
  Eye,
  MessageSquarePlus,
  Clock,
  ShieldAlert,
  Loader2,
  Trash2,
  ExternalLink,
  Mail,
  Send,
  Building2,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Link2
} from "lucide-react";
import Portal from "@/components/layout/Portal";

export interface ShareLinkData {
  id: string;
  token: string;
  accessLevel: "VIEWER" | "COMMENTER";
  expiresAt: string | null;
  isRevoked: boolean;
  isExpired: boolean;
  isActive: boolean;
  shareUrl: string;
  createdAt: string;
}

interface ProjectClientInfo {
  id?: string;
  name?: string;
  email?: string;
  company?: string | null;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectClient?: ProjectClientInfo | null;
}

export default function ShareModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectClient: initialClient,
}: ShareModalProps) {
  // Client state
  const [client, setClient] = useState<ProjectClientInfo | null>(initialClient || null);

  // Form state
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [accessLevel, setAccessLevel] = useState<"VIEWER" | "COMMENTER">("COMMENTER");
  const [customNote, setCustomNote] = useState("");

  // Loading & status states
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLinkData[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quickCopied, setQuickCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Fetch project details if client wasn't provided directly in props
  const fetchProjectClient = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.project?.client) {
          setClient(data.project.client);
          // If recipient email is still empty, auto-select client
          setRecipientEmail((prev) => prev || data.project.client.email || "");
          setRecipientName((prev) => prev || data.project.client.name || "");
        } else if (data.project?.clientName) {
          setClient({ name: data.project.clientName });
          setRecipientName((prev) => prev || data.project.clientName);
        }
      }
    } catch {
      // Non-blocking
    }
  }, [projectId]);

  // Fetch existing share links
  const fetchLinks = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingList(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}/share`);
      if (res.ok) {
        const data = await res.json();
        setShareLinks(data.shareLinks || []);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load active share links");
      }
    } catch {
      setErrorMessage("Network error fetching active share links");
    } finally {
      setIsLoadingList(false);
    }
  }, [projectId]);

  // Initialize on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setSuccessMessage("");
      fetchLinks();

      if (initialClient?.email) {
        setClient(initialClient);
        setRecipientEmail(initialClient.email);
        setRecipientName(initialClient.name || "");
      } else {
        fetchProjectClient();
      }
    }
  }, [isOpen, initialClient, fetchLinks, fetchProjectClient]);

  // Tap button to auto-fill project client's details
  const handleAutoFillClient = () => {
    if (!client) return;
    if (client.email) {
      setRecipientEmail(client.email);
    }
    if (client.name) {
      setRecipientName(client.name);
    }
    setSuccessMessage(`Auto-filled client details for ${client.name || "Client"}`);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Dispatch Email via Brevo
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || isSendingEmail) return;

    setIsSendingEmail(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/share/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || undefined,
          clientId: client?.id || undefined,
          accessLevel,
          expiresInDays: 30, // 30-day client access
          customNote: customNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch preview invitation email");
      }

      setSuccessMessage(data.message || `Invitation successfully sent to ${recipientEmail}`);

      // Instantly add the created share link to active list
      if (data.shareLink) {
        setShareLinks((prev) => [
          data.shareLink,
          ...prev.filter((l) => l.id !== data.shareLink.id),
        ]);
      }
      // Re-fetch to ensure complete sync
      fetchLinks();

      // Reset personal note
      setCustomNote("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Generate & Copy Direct Link immediately (same view, no tab switch needed)
  const handleGenerateAndCopyLink = async () => {
    if (isGeneratingLink) return;

    setIsGeneratingLink(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessLevel,
          expiresInDays: 30,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Immediately update active links list
        if (data.shareLink) {
          setShareLinks((prev) => [
            data.shareLink,
            ...prev.filter((l) => l.id !== data.shareLink.id),
          ]);
        }

        // Copy link to clipboard
        if (data.shareUrl) {
          await navigator.clipboard.writeText(data.shareUrl);
          setCopiedId(data.shareLink.id);
          setQuickCopied(true);
          setSuccessMessage("Share link created and copied to clipboard!");
          setTimeout(() => {
            setCopiedId(null);
            setQuickCopied(false);
            setSuccessMessage("");
          }, 3500);
        }

        // Background sync
        fetchLinks();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to generate share link");
      }
    } catch {
      setErrorMessage("Network error generating share link");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Revoke link
  const handleRevoke = async (linkId: string) => {
    if (revokingId) return;
    setRevokingId(linkId);
    try {
      const res = await fetch(`/api/projects/${projectId}/share?linkId=${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShareLinks((prev) =>
          prev.map((l) =>
            l.id === linkId ? { ...l, isRevoked: true, isActive: false } : l
          )
        );
      }
    } catch (err) {
      console.error("Failed to revoke link:", err);
    } finally {
      setRevokingId(null);
    }
  };

  // Copy link helper from list
  const handleCopyExistingLink = async (link: ShareLinkData) => {
    try {
      await navigator.clipboard.writeText(link.shareUrl);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const activeLinks = shareLinks.filter((l) => l.isActive);
  const isClientEmailSelected = Boolean(
    client?.email && recipientEmail.trim().toLowerCase() === client.email.trim().toLowerCase()
  );

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl text-foreground max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <span>Share Preview</span>
                  <span className="rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-mono font-medium text-foreground">
                    {projectName}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send interactive preview invitations directly via Brevo or generate instant share links.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Feedback Banners */}
          {successMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Scrollable Body (Single Unified Form) */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
            {/* 1. Access Permission Selection */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Access Permission
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setAccessLevel("COMMENTER")}
                  className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition-all ${
                    accessLevel === "COMMENTER"
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
                      : "border-border bg-secondary/30 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <MessageSquarePlus className="h-4 w-4 text-emerald-500" />
                      <span>Commenter (Recommended)</span>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        accessLevel === "COMMENTER" ? "bg-emerald-500" : "bg-border"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Can inspect all viewports, click interactive links, and pin pinpoint feedback.
                  </p>
                </div>

                <div
                  onClick={() => setAccessLevel("VIEWER")}
                  className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition-all ${
                    accessLevel === "VIEWER"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-border bg-secondary/30 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Eye className="h-4 w-4 text-primary" />
                      <span>Viewer (Read-Only)</span>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        accessLevel === "VIEWER" ? "bg-primary" : "bg-border"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Can preview responsive viewports. Cannot drop comment pins or add replies.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Recipient Client & Email Section */}
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Recipient Email
                  </label>

                  {/* 1-Tap Client Auto-fill Button (No dropdown!) */}
                  {client?.email ? (
                    <button
                      type="button"
                      onClick={handleAutoFillClient}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        isClientEmailSelected
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20"
                      }`}
                      title={`Auto-fill ${client.name} (${client.email})`}
                    >
                      {isClientEmailSelected ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Project Client Selected: {client.name}</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="h-3 w-3" />
                          <span>Auto-fill Client: {client.name}</span>
                        </>
                      )}
                    </button>
                  ) : client?.name ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3 opacity-60" />
                      <span>Client: {client.name}</span>
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="client@company.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full h-10 px-3 pl-9 rounded-xl border border-border bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Recipient Name (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Recipient Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              {/* Personal Note (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Personal Note (Included in Email)
                </label>
                <textarea
                  rows={2}
                  placeholder="Hi, here is the latest interactive preview for your review..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none shadow-2xs"
                />
              </div>

              {/* Unified Action Bar: Both "Send Email" and "Generate & Copy Link" side-by-side */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border/60">
                {/* Secondary Action: Instant Generate & Copy Link */}
                <button
                  type="button"
                  onClick={handleGenerateAndCopyLink}
                  disabled={isGeneratingLink}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-card hover:bg-secondary px-4 py-2.5 text-xs font-semibold text-foreground shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Generate a direct link with selected permission and copy it to clipboard"
                >
                  {isGeneratingLink ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating Link...</span>
                    </>
                  ) : quickCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-primary" />
                      <span>Generate & Copy Link</span>
                    </>
                  )}
                </button>

                {/* Primary Action: Send Email via Brevo */}
                <button
                  type="submit"
                  disabled={isSendingEmail || !recipientEmail}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending Invitation...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Preview Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* 3. Existing Active Share Links Section */}
            <div className="border-t border-border/80 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Active Share Links ({activeLinks.length})
                  </span>
                </div>
              </div>

              {isLoadingList ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Loading active links...</span>
                </div>
              ) : activeLinks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground">
                  No active share links yet. Send an email invitation or click &ldquo;Generate & Copy Link&rdquo; above.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              link.accessLevel === "COMMENTER"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-primary/10 text-primary border border-primary/30"
                            }`}
                          >
                            {link.accessLevel}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">
                            {link.token.slice(0, 16)}...
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {link.expiresAt
                            ? `Expires ${new Date(link.expiresAt).toLocaleDateString()}`
                            : "Never expires"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyExistingLink(link)}
                          className="flex h-7 px-2.5 items-center gap-1 rounded-lg border border-border bg-card text-[11px] font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        >
                          {copiedId === link.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <a
                          href={link.shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Open preview link in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleRevoke(link.id)}
                          disabled={revokingId === link.id}
                          title="Revoke Link"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {revokingId === link.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
