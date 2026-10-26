"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  CornerDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Tablet,
  Smartphone,
  Trash2,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Shield,
  Code2,
  UserCheck,
  Check,
  FileText
} from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";

export interface AuthorUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DEVELOPER";
  avatarUrl?: string | null;
}

export interface CommentReplyItem {
  id: string;
  commentId: string;
  content: string;
  authorUserId?: string | null;
  authorUser?: AuthorUser | null;
  guestAuthorName?: string | null;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  projectId: string;
  pageId: string;
  page?: {
    id: string;
    path: string;
    title: string;
    fullUrl: string;
  };
  authorUserId?: string | null;
  authorUser?: AuthorUser | null;
  guestAuthorName?: string | null;
  guestAuthorEmail?: string | null;
  content: string;
  posX?: number | null;
  posY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  scrollY?: number | null;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  resolvedAt?: string | null;
  resolvedByUser?: {
    id: string;
    name: string;
    role: string;
  } | null;
  replies: CommentReplyItem[];
  createdAt: string;
  updatedAt?: string;
}

interface CommentCardProps {
  comment: CommentItem;
  index: number;
  isSelected?: boolean;
  onSelect: (id: string, comment?: CommentItem) => void;
  onUpdateStatus?: (id: string, status: "PENDING" | "IN_PROGRESS" | "RESOLVED") => Promise<void>;
  onAddReply?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  currentUserId?: string;
  currentUserRole?: string;
  clientOwnCommentIds?: string[];
  currentGuestName?: string;
}

// Format relative time helper
function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// Get device icon and label
function getDeviceMeta(width?: number | null) {
  if (!width) {
    return { icon: Monitor, label: "Screen" };
  }
  if (width <= 480) {
    return { icon: Smartphone, label: "Mobile" };
  } else if (width <= 850) {
    return { icon: Tablet, label: "Tablet" };
  } else {
    return { icon: Monitor, label: "Desktop" };
  }
}

export default function CommentCard({
  comment,
  index,
  isSelected = false,
  onSelect,
  onUpdateStatus,
  onAddReply,
  onDelete,
  currentUserId,
  currentUserRole,
  clientOwnCommentIds,
  currentGuestName,
}: CommentCardProps) {
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(comment.replies.length > 0);
  const [replyInput, setReplyInput] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusMenuOpen]);

  // Author details (Scoped: Developers see "Client" for client comments; Admins see real guest name; Admin authored shows Admin name)
  const isClientAuthor = !comment.authorUserId || Boolean(comment.guestAuthorName);
  const authorName = currentUserRole === "DEVELOPER" && isClientAuthor
    ? "Client"
    : (comment.authorUser?.name || comment.guestAuthorName || "Client Reviewer");
  const authorRole = comment.authorUser?.role || "CLIENT";

  const deviceMeta = getDeviceMeta(comment.viewportWidth);
  const DeviceIcon = deviceMeta.icon;

  const isOwnComment =
    (clientOwnCommentIds && clientOwnCommentIds.includes(comment.id)) ||
    (Boolean(comment.guestAuthorName) &&
      Boolean(currentGuestName) &&
      comment.authorUserId === null &&
      Boolean(currentGuestName && comment.guestAuthorName?.trim().toLowerCase() === currentGuestName.trim().toLowerCase()));

  const canDelete =
    currentUserRole === "ADMIN" ||
    (Boolean(currentUserId) && comment.authorUserId === currentUserId) ||
    Boolean(isOwnComment);

  // Status badge styling & icons - Modern Vanguard Design Tokens
  const getStatusBadge = () => {
    switch (comment.status) {
      case "RESOLVED":
        return {
          label: "Resolved",
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15",
          dotClass: "bg-emerald-500",
          icon: CheckCircle2,
        };
      case "IN_PROGRESS":
        return {
          label: "In Progress",
          badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25 hover:bg-sky-500/15",
          dotClass: "bg-sky-500 animate-pulse",
          icon: Clock,
        };
      case "PENDING":
      default:
        return {
          label: "Pending",
          badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/15",
          dotClass: "bg-amber-500",
          icon: AlertCircle,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  const handleStatusChange = async (newStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED") => {
    if (!onUpdateStatus || isUpdatingStatus || newStatus === comment.status) return;
    setIsUpdatingStatus(true);
    setStatusMenuOpen(false);
    try {
      await onUpdateStatus(comment.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReplySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyInput.trim() || !onAddReply || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      await onAddReply(comment.id, replyInput.trim());
      setReplyInput("");
      setIsRepliesExpanded(true);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || isDeleting) return;
    if (confirm("Are you sure you want to delete this annotation pin?")) {
      setIsDeleting(true);
      try {
        await onDelete(comment.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div
      onClick={() => onSelect(comment.id, comment)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden p-4 ${
        isSelected
          ? "border-primary bg-primary/[0.03] shadow-md ring-1 ring-primary/30"
          : "border-border/70 bg-card hover:border-border hover:shadow-xs"
      }`}
    >
      {/* Active Pin accent line */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-primary" />
      )}

      {/* Card Header: Pin Number, Author, Role, Time & Status */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Monospace Pin Badge */}
          <span className="flex h-5 items-center justify-center rounded-md bg-secondary border border-border/80 px-1.5 text-[10px] font-bold text-foreground font-mono shadow-2xs shrink-0">
            #{index}
          </span>

          {/* Author Avatar */}
          <UserAvatar
            user={{
              name: authorName,
              avatarUrl: comment.authorUser?.avatarUrl,
            }}
            size="sm"
            withRing={false}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                {authorName}
              </span>

              {/* Role Pill */}
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${
                  authorRole === "ADMIN"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : authorRole === "DEVELOPER"
                    ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {authorRole === "ADMIN" ? (
                  <>
                    <Shield className="h-2.5 w-2.5" />
                    <span>Admin</span>
                  </>
                ) : authorRole === "DEVELOPER" ? (
                  <>
                    <Code2 className="h-2.5 w-2.5" />
                    <span>Dev</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="h-2.5 w-2.5" />
                    <span>Client</span>
                  </>
                )}
              </span>
            </div>

            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-2.5 w-2.5 opacity-60" />
              <span>{formatTimeAgo(comment.createdAt)}</span>
            </span>
          </div>
        </div>

        {/* Right controls: Status Dropdown & Delete */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Status Dropdown */}
          <div className="relative" ref={statusMenuRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => currentUserRole !== "CLIENT" && setStatusMenuOpen((prev) => !prev)}
              disabled={isUpdatingStatus || currentUserRole === "CLIENT"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-all shadow-2xs ${
                currentUserRole === "CLIENT" ? "cursor-default" : "cursor-pointer"
              } ${statusBadge.badgeClass}`}
              title={currentUserRole === "CLIENT" ? `Status: ${statusBadge.label}` : "Change task status"}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dotClass}`} />
              )}
              <span>{statusBadge.label}</span>
              {currentUserRole !== "CLIENT" && (
                <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
              )}
            </button>

            {statusMenuOpen && currentUserRole !== "CLIENT" && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-36 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleStatusChange("PENDING")}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    comment.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>Pending</span>
                  </span>
                  {comment.status === "PENDING" && <Check className="h-3 w-3 text-amber-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    comment.status === "IN_PROGRESS"
                      ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                    <span>In Progress</span>
                  </span>
                  {comment.status === "IN_PROGRESS" && <Check className="h-3 w-3 text-sky-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange("RESOLVED")}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    comment.status === "RESOLVED"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Resolved</span>
                  </span>
                  {comment.status === "RESOLVED" && <Check className="h-3 w-3 text-emerald-500" />}
                </button>
              </div>
            )}
          </div>

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
              title="Delete comment pin"
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Comment Content */}
      <div className="mt-3 text-[13px] text-foreground leading-relaxed break-words whitespace-pre-wrap font-normal">
        {comment.content}
      </div>

      {/* Context Metadata Ribbon: Device Viewport, Page Path, Pin Coords */}
      <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-1.5 text-[10px]">
        {Boolean(comment.viewportWidth && comment.viewportHeight) ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(comment.id, comment);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 px-2 py-0.5 border border-border/70 transition-all cursor-pointer text-muted-foreground font-medium group/chip shadow-2xs"
            title={`Snap preview to ${comment.viewportWidth}×${comment.viewportHeight} and scroll to pin`}
          >
            <DeviceIcon className="h-3 w-3 text-muted-foreground group-hover/chip:text-primary transition-colors" />
            <span>
              {deviceMeta.label} <span className="opacity-60 font-mono text-[9px]">({comment.viewportWidth}×{comment.viewportHeight})</span>
            </span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/40 px-2 py-0.5 border border-border/60 text-muted-foreground font-medium">
            <DeviceIcon className="h-3 w-3" />
            <span>General Task</span>
          </div>
        )}

        {comment.page?.path && (
          <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/40 px-2 py-0.5 border border-border/60 font-mono text-[9.5px] text-muted-foreground">
            <FileText className="h-2.5 w-2.5 opacity-60" />
            <span className="text-foreground">{comment.page.title}</span>
            <span className="opacity-60">({comment.page.path})</span>
          </div>
        )}

        {typeof comment.posX === "number" && typeof comment.posY === "number" && (
          <div className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground/75 ml-auto font-mono">
            <MapPin className="h-2.5 w-2.5 text-primary opacity-80" />
            <span>
              {comment.posX.toFixed(1)}% / {comment.posY.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Threaded Replies Accordion Toggle */}
      <div className="mt-2.5 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsRepliesExpanded((prev) => !prev);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>
            {comment.replies.length > 0
              ? `${comment.replies.length} ${
                  comment.replies.length === 1 ? "reply" : "replies"
                }`
              : "Reply"}
          </span>
          {comment.replies.length > 0 &&
            (isRepliesExpanded ? (
              <ChevronUp className="h-3 w-3 opacity-60" />
            ) : (
              <ChevronDown className="h-3 w-3 opacity-60" />
            ))}
        </button>
      </div>

      {/* Threaded Replies List & Reply Input */}
      {isRepliesExpanded && (
        <div className="mt-2.5 space-y-2.5 border-l-2 border-border/70 ml-2 pl-3.5" onClick={(e) => e.stopPropagation()}>
          {comment.replies.map((reply) => {
            const isClientReply = !reply.authorUserId || Boolean(reply.guestAuthorName);
            const replyAuthorName = currentUserRole === "DEVELOPER" && isClientReply
              ? "Client"
              : (reply.authorUser?.name || reply.guestAuthorName || "Guest Reviewer");
            const replyRole = reply.authorUser?.role || "CLIENT";

            return (
              <div
                key={reply.id}
                className="rounded-xl bg-secondary/30 border border-border/60 p-2.5 text-xs shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar
                      user={{
                        name: replyAuthorName,
                        avatarUrl: reply.authorUser?.avatarUrl,
                      }}
                      size="xs"
                      withRing={false}
                    />

                    <span className="text-[11px] font-semibold text-foreground">
                      {replyAuthorName}
                    </span>

                    <span
                      className={`text-[8.5px] font-semibold uppercase px-1 py-0.2 rounded-full ${
                        replyRole === "ADMIN"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : replyRole === "DEVELOPER"
                          ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {replyRole === "ADMIN" ? "Admin" : replyRole === "DEVELOPER" ? "Dev" : "Client"}
                    </span>
                  </div>

                  <span className="text-[9px] text-muted-foreground font-mono">
                    {formatTimeAgo(reply.createdAt)}
                  </span>
                </div>

                <p className="text-[12px] text-foreground/90 pl-5 whitespace-pre-wrap leading-relaxed">
                  {reply.content}
                </p>
              </div>
            );
          })}

          {/* Quick Reply Form */}
          <form onSubmit={handleReplySubmit} className="flex items-center gap-1.5 pt-1 min-w-0">
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReplySubmit();
                }
              }}
              placeholder="Write a reply... (Enter to send)"
              className="flex-1 min-w-0 rounded-xl border border-input/80 bg-background/90 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/20 focus:border-primary/40 outline-none shadow-2xs transition-all"
            />
            <button
              type="submit"
              disabled={!replyInput.trim() || isSubmittingReply}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Send Reply (Enter)"
            >
              {isSubmittingReply ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
