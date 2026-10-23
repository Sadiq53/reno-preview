"use client";

import React, { useState } from "react";
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
  UserCheck
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

  // Author details (Scoped: Developers see "Client" for client comments; Admins see real guest name; Admin authored shows Admin name)
  const isClientAuthor = !comment.authorUserId || Boolean(comment.guestAuthorName);
  const authorName = currentUserRole === "DEVELOPER" && isClientAuthor
    ? "Client"
    : (comment.authorUser?.name || comment.guestAuthorName || "Client Reviewer");
  const authorRole = comment.authorUser?.role || "CLIENT";
  const authorInitial = authorName.charAt(0).toUpperCase();

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

  // Status badge styling & icons
  const getStatusBadge = () => {
    switch (comment.status) {
      case "RESOLVED":
        return {
          label: "Resolved",
          badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
          icon: CheckCircle2,
        };
      case "IN_PROGRESS":
        return {
          label: "In Progress",
          badgeClass: "bg-blue-100 text-blue-900 border-blue-300",
          icon: Clock,
        };
      case "PENDING":
      default:
        return {
          label: "Pending",
          badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
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

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
        isSelected
          ? "border-primary bg-primary/[0.04] shadow-md ring-1 ring-primary/30"
          : "border-border/80 bg-card hover:border-border hover:shadow-xs"
      }`}
    >
      {/* Active Pin accent line */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
      )}

      <div className="p-4">
        {/* Card Header: Author, Role, Time, and Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {/* Author Avatar with Role glow */}
            <UserAvatar
              user={{
                name: authorName,
                avatarUrl: comment.authorUser?.avatarUrl,
              }}
              size="sm"
              withRing={true}
            />

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground leading-tight">
                  {authorName}
                </span>

                {/* Role Pill */}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${
                    authorRole === "ADMIN"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : authorRole === "DEVELOPER"
                      ? "bg-secondary text-secondary-foreground border border-border"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  }`}
                >
                  {authorRole === "ADMIN" ? (
                    <span className="flex items-center gap-0.5">
                      <Shield className="h-2.5 w-2.5" /> Admin
                    </span>
                  ) : authorRole === "DEVELOPER" ? (
                    <span className="flex items-center gap-0.5">
                      <Code2 className="h-2.5 w-2.5" /> Dev
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <UserCheck className="h-2.5 w-2.5" /> Client
                    </span>
                  )}
                </span>
              </div>

              <span className="text-[10px] text-muted-foreground">
                {formatTimeAgo(comment.createdAt)}
              </span>
            </div>
          </div>

          {/* Right controls: Pin Index badge & Status Selector */}
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 items-center justify-center rounded-md bg-secondary border border-border px-1.5 text-[10px] font-bold text-secondary-foreground font-mono">
              #{index}
            </span>

            {/* Status Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => currentUserRole !== "CLIENT" && setStatusMenuOpen((prev) => !prev)}
                disabled={isUpdatingStatus || currentUserRole === "CLIENT"}
                className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition-all shadow-xs ${
                  currentUserRole === "CLIENT" ? "cursor-default" : "cursor-pointer"
                } ${statusBadge.badgeClass}`}
                title={currentUserRole === "CLIENT" ? `Status: ${statusBadge.label}` : "Change task status"}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <StatusIcon className="h-2.5 w-2.5" />
                )}
                <span>{statusBadge.label}</span>
                {currentUserRole !== "CLIENT" && <ChevronDown className="h-2.5 w-2.5 opacity-60" />}
              </button>

              {statusMenuOpen && currentUserRole !== "CLIENT" && (
                <div className="absolute right-0 top-full mt-1 z-30 w-32 rounded-xl border border-border bg-card p-1 shadow-2xl animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => handleStatusChange("PENDING")}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-amber-900 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                    <span>Pending</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange("IN_PROGRESS")}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-blue-900 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Clock className="h-3 w-3 text-blue-600" />
                    <span>In Progress</span>
                  </button>
                  <button
                    onClick={() => handleStatusChange("RESOLVED")}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-emerald-900 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Resolved</span>
                  </button>
                </div>
              )}
            </div>

            {canDelete && (
              <button
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
        <div className="mt-2.5 text-xs text-foreground leading-relaxed break-words whitespace-pre-wrap">
          {comment.content}
        </div>

        {/* Context metadata ribbon: Device Viewport, Page Path, Pin Coords */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          {Boolean(comment.viewportWidth && comment.viewportHeight) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(comment.id, comment);
              }}
              className="flex items-center gap-1 rounded-md bg-muted/60 hover:bg-primary/10 hover:text-primary px-2 py-0.5 border border-border/80 transition-colors cursor-pointer text-[10px]"
              title={`Snap preview to ${comment.viewportWidth}×${comment.viewportHeight} and scroll to pin`}
            >
              <DeviceIcon className="h-3 w-3" />
              <span className="font-semibold">
                {deviceMeta.label} ({comment.viewportWidth}×{comment.viewportHeight})
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 border border-border/80 text-[10px] text-muted-foreground font-medium">
              <DeviceIcon className="h-3 w-3" />
              <span>General Task</span>
            </div>
          )}

          {comment.page?.path && (
            <div className="flex items-center gap-1 rounded-md bg-muted/40 px-2 py-0.5 border border-border/80 font-mono text-[9px] text-foreground">
              <span>{comment.page.title}</span>
              <span className="text-muted-foreground">({comment.page.path})</span>
            </div>
          )}

          {typeof comment.posX === "number" && typeof comment.posY === "number" && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground ml-auto font-mono">
              <MapPin className="h-2.5 w-2.5" />
              <span>
                {comment.posX.toFixed(1)}% / {comment.posY.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Threaded Replies Accordion Toggle */}
        <div className="mt-3 pt-2.5 border-t border-border/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRepliesExpanded((prev) => !prev);
            }}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
          <div className="mt-3 space-y-2.5 pl-3 border-l-2 border-border" onClick={(e) => e.stopPropagation()}>
            {comment.replies.map((reply) => {
              const isClientReply = !reply.authorUserId || Boolean(reply.guestAuthorName);
              const replyAuthorName = currentUserRole === "DEVELOPER" && isClientReply
                ? "Client"
                : (reply.authorUser?.name || reply.guestAuthorName || "Guest Reviewer");
              const replyRole = reply.authorUser?.role || "CLIENT";
              const replyInitial = replyAuthorName.charAt(0).toUpperCase();

              return (
                <div
                  key={reply.id}
                  className="rounded-xl bg-muted/30 border border-border/80 p-2.5"
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
                        className={`text-[8px] font-semibold uppercase px-1 py-0.5 rounded ${
                          replyRole === "ADMIN"
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : replyRole === "DEVELOPER"
                            ? "bg-secondary text-secondary-foreground border border-border"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {replyRole === "ADMIN" ? "Admin" : replyRole === "DEVELOPER" ? "Dev" : "Client"}
                      </span>
                    </div>

                    <span className="text-[9px] text-muted-foreground">
                      {formatTimeAgo(reply.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/90 pl-5 whitespace-pre-wrap leading-relaxed">
                    {reply.content}
                  </p>
                </div>
              );
            })}

            {/* Quick Reply Form */}
            <form onSubmit={handleReplySubmit} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25 outline-none shadow-xs"
              />
              <button
                type="submit"
                disabled={!replyInput.trim() || isSubmittingReply}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
                title="Send Reply"
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
    </div>
  );
}
