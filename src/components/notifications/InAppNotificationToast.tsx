"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  Check,
  ExternalLink,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  MessageSquare,
  MessageCircle,
  UserCheck,
  KeyRound,
  Layers,
  Sparkles,
} from "lucide-react";
import { ActiveToast } from "./NotificationContext";

interface InAppNotificationToastProps {
  toast: ActiveToast;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => Promise<void>;
  onOpenDrawer: () => void;
}

export default function InAppNotificationToast({
  toast,
  onDismiss,
  onMarkRead,
  onOpenDrawer,
}: InAppNotificationToastProps) {
  const router = useRouter();
  const { notification, autoDismissMs = 9000, unreadTotal, isInitialWelcome } = toast;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingMsRef = useRef<number>(autoDismissMs);

  // Progressive countdown bar that pauses on hover
  useEffect(() => {
    if (autoDismissMs <= 0) return;

    let animFrame: number;
    let lastTime = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      if (!isPaused) {
        remainingMsRef.current -= delta;
        const pct = Math.max(0, (remainingMsRef.current / autoDismissMs) * 100);
        setProgress(pct);

        if (remainingMsRef.current <= 0) {
          handleClose();
          return;
        }
      }

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isPaused, autoDismissMs]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 280);
  };

  const handleAction = async () => {
    await onMarkRead(notification.id);
    handleClose();
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleQuickMarkRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onMarkRead(notification.id);
    handleClose();
  };

  // Helper for notification type visuals & theme
  const getTypeConfig = (type: string) => {
    switch (type) {
      case "TASK_RESOLVED":
        return {
          icon: CheckCircle2,
          badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
          glowColor: "from-emerald-500/10 via-emerald-500/5 to-transparent",
          progressColor: "bg-emerald-500",
          label: "Task Resolved",
        };
      case "TASK_STARTED":
        return {
          icon: PlayCircle,
          badgeColor: "text-blue-700 bg-blue-50 border-blue-200",
          glowColor: "from-blue-500/10 via-blue-500/5 to-transparent",
          progressColor: "bg-primary",
          label: "In Progress",
        };
      case "PRIORITY_URGENT":
        return {
          icon: AlertTriangle,
          badgeColor: "text-rose-700 bg-rose-50 border-rose-200",
          glowColor: "from-rose-500/15 via-rose-500/5 to-transparent",
          progressColor: "bg-rose-500",
          label: "Urgent Priority",
        };
      case "COMMENT_CREATED":
        return {
          icon: MessageSquare,
          badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
          glowColor: "from-amber-500/10 via-amber-500/5 to-transparent",
          progressColor: "bg-amber-500",
          label: "New Feedback",
        };
      case "QUERY_REPLIED":
        return {
          icon: MessageCircle,
          badgeColor: "text-purple-700 bg-purple-50 border-purple-200",
          glowColor: "from-purple-500/10 via-purple-500/5 to-transparent",
          progressColor: "bg-purple-500",
          label: "Query Reply",
        };
      case "TASK_ASSIGNED":
        return {
          icon: UserCheck,
          badgeColor: "text-sky-700 bg-sky-50 border-sky-200",
          glowColor: "from-sky-500/10 via-sky-500/5 to-transparent",
          progressColor: "bg-primary",
          label: "Task Assigned",
        };
      case "PROJECT_ACCESS_GRANTED":
        return {
          icon: KeyRound,
          badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
          glowColor: "from-emerald-500/10 via-emerald-500/5 to-transparent",
          progressColor: "bg-emerald-500",
          label: "Access Granted",
        };
      default:
        return {
          icon: Bell,
          badgeColor: "text-primary bg-primary/10 border-primary/20",
          glowColor: "from-primary/10 via-primary/5 to-transparent",
          progressColor: "bg-primary",
          label: "Notification",
        };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);

      if (diffSec < 45) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      return "Recent";
    } catch {
      return "Recent";
    }
  };

  const config = getTypeConfig(notification.type);
  const IconComponent = config.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative w-full max-w-sm sm:max-w-md pointer-events-auto select-none rounded-2xl border border-border bg-card p-4 shadow-xl transition-all duration-300 overflow-hidden ${
        isExiting
          ? "opacity-0 translate-y-3 scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-in slide-in-from-bottom-5 fade-in duration-300"
      } hover:border-primary/40 hover:shadow-2xl`}
      style={{
        boxShadow: "0 12px 32px -4px rgba(15, 23, 42, 0.10), 0 4px 12px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(226, 232, 240, 0.9)",
      }}
    >
      {/* Dynamic ambient background glow */}
      <div
        className={`pointer-events-none absolute -top-12 -left-12 h-36 w-36 rounded-full bg-gradient-to-br ${config.glowColor} blur-2xl opacity-70`}
      />

      {/* Header Row */}
      <div className="relative flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {/* Notification Type Icon Badge */}
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 ${config.badgeColor}`}
          >
            <IconComponent className="h-3.5 w-3.5" />
          </div>

          {/* Category Tag & Initial App Open Marker */}
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-[11px] font-bold text-foreground tracking-tight">
              {config.label}
            </span>

            {isInitialWelcome && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-semibold border border-primary/20">
                <Sparkles className="h-2.5 w-2.5" />
                Latest Update
              </span>
            )}

            {notification.project && (
              <span className="text-[10px] text-muted-foreground/80 truncate rounded bg-secondary/80 px-1.5 py-0.5 border border-border/60">
                {notification.project.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-muted-foreground/70 font-medium">
            {formatRelativeTime(notification.createdAt)}
          </span>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Dismiss message"
            aria-label="Dismiss message"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title & Message Content */}
      <div className="relative pl-0 sm:pl-0.5">
        <h4 className="text-xs font-bold text-foreground leading-snug tracking-tight line-clamp-1">
          {notification.title}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Action Buttons Row */}
      <div className="relative mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Main Action Button (Open Task / Preview) */}
          {notification.link ? (
            <button
              type="button"
              onClick={handleAction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span>View Details</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                handleClose();
                onOpenDrawer();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span>View All</span>
              <Layers className="h-3 w-3" />
            </button>
          )}

          {/* Mark as Read Button */}
          {!notification.isRead && (
            <button
              type="button"
              onClick={handleQuickMarkRead}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium border border-border/70 transition-all cursor-pointer"
              title="Mark as read"
            >
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="hidden sm:inline">Mark Read</span>
            </button>
          )}
        </div>

        {/* If multiple unreads on app open, show unread count indicator */}
        {unreadTotal && unreadTotal > 1 ? (
          <button
            type="button"
            onClick={() => {
              handleClose();
              onOpenDrawer();
            }}
            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>+{unreadTotal - 1} more unread</span>
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
            Press Esc or click to dismiss
          </span>
        )}
      </div>

      {/* Auto-Dismiss Countdown Progress Bar at Bottom Edge */}
      {autoDismissMs > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/40 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${config.progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
