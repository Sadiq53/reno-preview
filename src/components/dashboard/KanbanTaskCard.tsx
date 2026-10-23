"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  MessageSquare,
  Eye,
  ExternalLink,
  StickyNote,
  AlertCircle,
  Flame,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  User,
  Shield,
  Briefcase
} from "lucide-react";

export interface TaskCardData {
  id: string;
  projectId: string;
  pageId?: string | null;
  title?: string | null;
  content: string;
  notes?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  posX?: number | null;
  posY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  scrollY?: number;
  guestAuthorName?: string | null;
  guestAuthorEmail?: string | null;
  createdAt: string;
  updatedAt?: string;
  project?: {
    id: string;
    name: string;
    clientName: string;
    targetUrl?: string;
  } | null;
  page?: {
    id: string;
    path: string;
    title?: string;
    fullUrl?: string;
  } | null;
  authorUser?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    avatarUrl?: string | null;
  } | null;
  assigneeUser?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    avatarUrl?: string | null;
  } | null;
  resolvedByUser?: {
    id: string;
    name: string;
    role?: string;
  } | null;
  replies?: Array<{
    id: string;
    content: string;
    createdAt: string;
    authorUser?: {
      id: string;
      name: string;
      role?: string;
    } | null;
  }>;
}

export interface KanbanTaskCardProps {
  task: TaskCardData;
  onOpen: () => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onStatusChange?: (id: string, status: "PENDING" | "IN_PROGRESS" | "RESOLVED") => void;
  showProjectBadge?: boolean;
  isDraggable?: boolean;
  currentRole?: "ADMIN" | "DEVELOPER" | "CLIENT";
}

// Format relative time (e.g. "2h ago", "Yesterday", "3d ago")
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function KanbanTaskCard({
  task,
  onOpen,
  onDragStart,
  onStatusChange,
  showProjectBadge = false,
  isDraggable = true,
  currentRole,
}: KanbanTaskCardProps) {
  // Priority styling tokens (clean professional badges, no AI-like thick borders)
  const priorityConfig = {
    URGENT: {
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
      icon: <Flame className="h-3 w-3 text-rose-600" />,
      label: "Urgent",
    },
    HIGH: {
      badge: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
      icon: <AlertCircle className="h-3 w-3 text-amber-600" />,
      label: "High",
    },
    MEDIUM: {
      badge: "bg-sky-50 text-sky-800 border-sky-200",
      dot: "bg-sky-500",
      icon: null,
      label: "Medium",
    },
    LOW: {
      badge: "bg-slate-100 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
      icon: null,
      label: "Low",
    },
  }[task.priority || "MEDIUM"];

  // Viewport device indicator
  const getDeviceIcon = () => {
    if (!task.viewportWidth) return null;
    if (task.viewportWidth <= 480) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono" title={`Mobile viewport ${task.viewportWidth}px`}>
          <Smartphone className="h-2.5 w-2.5 text-primary" />
          <span>{task.viewportWidth}px</span>
        </span>
      );
    }
    if (task.viewportWidth <= 1024) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono" title={`Tablet viewport ${task.viewportWidth}px`}>
          <Tablet className="h-2.5 w-2.5 text-primary" />
          <span>{task.viewportWidth}px</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono" title={`Desktop viewport ${task.viewportWidth}px`}>
        <Monitor className="h-2.5 w-2.5 text-primary" />
        <span>{task.viewportWidth}px</span>
      </span>
    );
  };

  // Author representation & role (Developers see "Client", Admins see real name, Admin tasks show Admin name)
  const isClientTask = !task.authorUser?.id || Boolean(task.guestAuthorName);
  const authorName = currentRole === "DEVELOPER" && isClientTask
    ? "Client"
    : (task.authorUser?.name || task.guestAuthorName || "Client");
  const authorRole = task.authorUser?.role || "CLIENT";
  const authorInitial = authorName.charAt(0).toUpperCase();

  const roleBadgeConfig = {
    ADMIN: { bg: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "Owner", icon: <Shield className="h-2.5 w-2.5" /> },
    DEVELOPER: { bg: "bg-sky-100 text-sky-800 border-sky-200", label: "Developer", icon: <Briefcase className="h-2.5 w-2.5" /> },
    CLIENT: { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Client", icon: <User className="h-2.5 w-2.5" /> },
  }[authorRole] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Reviewer", icon: <User className="h-2.5 w-2.5" /> };

  const repliesCount = task.replies?.length || 0;
  const isVisualPin = task.posX !== null && task.posX !== undefined && task.posY !== null && task.posY !== undefined;

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      onClick={onOpen}
      className="group relative rounded-xl border border-border/80 bg-card p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer select-none hover:border-primary/40"
    >
      {/* 1. Header: Priority, Project / Page Path, and Device Viewport */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityConfig.badge}`}>
            {priorityConfig.icon}
            <span>{priorityConfig.label}</span>
          </span>

          {showProjectBadge && task.project && (
            <span className="text-[10px] font-bold text-primary truncate max-w-[120px]" title={task.project.name}>
              {task.project.name}
            </span>
          )}

          <span className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded border border-border/40 truncate max-w-[130px]">
            {task.page?.path || "/"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {getDeviceIcon()}
          {isVisualPin && (
            <span className="inline-flex items-center text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded font-semibold" title={`Visual Pin: ${Math.round(task.posX || 0)}%, ${Math.round(task.posY || 0)}%`}>
              📍 Pin
            </span>
          )}
        </div>
      </div>

      {/* 2. Author & Relative Time Bar ("Who added" & "When added") */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
            {authorInitial}
          </div>
          <span className="text-xs font-semibold text-foreground truncate max-w-[110px]">
            {authorName}
          </span>
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold border ${roleBadgeConfig.bg}`}>
            {roleBadgeConfig.icon}
            <span>{roleBadgeConfig.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 font-medium">
          <Clock className="h-2.5 w-2.5" />
          <span>{formatRelativeTime(task.createdAt)}</span>
        </div>
      </div>

      {/* 3. Task Title & Message Content ("What message") */}
      <div className="mb-2.5">
        {task.title && (
          <h4 className="text-xs font-bold text-foreground mb-1 leading-snug line-clamp-2">
            {task.title}
          </h4>
        )}
        <p className="text-xs text-foreground/80 font-normal leading-relaxed line-clamp-3">
          {task.content}
        </p>
      </div>

      {/* 4. Optional Developer Technical Note Excerpt */}
      {task.notes && (
        <div className="mb-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 p-2 text-[11px] text-emerald-950 flex items-start gap-1.5">
          <StickyNote className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
          <span className="line-clamp-2 italic font-medium">{task.notes}</span>
        </div>
      )}

      {/* 5. Footer: Assignee, Thread Replies count, and Quick Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
        {/* Left: Assignee or Thread count */}
        <div className="flex items-center gap-2">
          {task.assigneeUser ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded" title={`Assigned to ${task.assigneeUser.name}`}>
              <User className="h-2.5 w-2.5 text-primary" />
              <span className="truncate max-w-[90px]">{task.assigneeUser.name}</span>
            </span>
          ) : null}

          {repliesCount > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold" title={`${repliesCount} thread discussion replies`}>
              <MessageSquare className="h-3 w-3 text-primary" />
              <span>{repliesCount}</span>
            </div>
          )}
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick status transition button */}
          {onStatusChange && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {task.status === "PENDING" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, "IN_PROGRESS");
                  }}
                  className="rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs"
                  title="Move to In Progress"
                >
                  <span>Start</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </button>
              )}
              {task.status === "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, "RESOLVED");
                  }}
                  className="rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs"
                  title="Mark as Resolved"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  <span>Done</span>
                </button>
              )}
              {task.status === "RESOLVED" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(task.id, "IN_PROGRESS");
                  }}
                  className="rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs"
                  title="Reopen task"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Reopen</span>
                </button>
              )}
            </div>
          )}

          {/* Inspect Pin in Visual Preview */}
          <Link
            href={`/preview/${task.projectId}?commentId=${task.id}`}
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            title="Inspect in Live Canvas Preview"
          >
            <Eye className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
