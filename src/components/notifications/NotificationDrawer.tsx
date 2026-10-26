"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  MessageSquare,
  MessageCircle,
  UserCheck,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Inbox
} from "lucide-react";
import { requestFcmToken } from "@/lib/firebase";

export interface NotificationItem {
  id: string;
  userId: string;
  projectId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  metadata?: Record<string, any> | null;
  createdAt: string;
  project?: {
    id: string;
    name: string;
    clientName: string;
  } | null;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onClearRead: () => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

type TabFilter = "all" | "unread" | "tasks" | "queries";

export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onClearRead,
  onDeleteNotification,
  soundEnabled,
  onToggleSound,
}: NotificationDrawerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [pushStatus, setPushStatus] = useState<"default" | "granted" | "denied">("default");
  const [isRegisteringPush, setIsRegisteringPush] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Smooth two-way sliding animation lifecycle
  useEffect(() => {
    let openTimer: NodeJS.Timeout;
    let closeTimer: NodeJS.Timeout;

    if (isOpen) {
      setShouldRender(true);
      // Wait a tick (25ms) so browser computes the initial translate-x-full & opacity-0 state
      // before transitioning to translate-x-0 & opacity-100
      openTimer = setTimeout(() => {
        setIsVisible(true);
      }, 25);
    } else {
      setIsVisible(false);
      // Allow full duration of 320ms for slide-out before unmounting from DOM
      closeTimer = setTimeout(() => {
        setShouldRender(false);
      }, 320);
    }

    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission);
    }
  }, [isOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Enable Desktop Web Push via Firebase Cloud Messaging
  const handleEnablePush = async () => {
    setIsRegisteringPush(true);
    try {
      const token = await requestFcmToken();
      if (token) {
        setPushStatus("granted");
      } else if (typeof window !== "undefined" && "Notification" in window) {
        setPushStatus(Notification.permission);
      }
    } catch (err) {
      console.warn("[FCM] Push activation error:", err);
    } finally {
      setIsRegisteringPush(false);
    }
  };

  const [isSendingTest, setIsSendingTest] = useState(false);
  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "System Test Notification",
          message: "Real-time SSE event bus and notification pipeline verified successfully!",
        }),
      });
    } catch (err) {
      console.warn("[Test Notification Error]:", err);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filter notifications based on tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "unread") return !item.isRead;
    if (activeTab === "tasks") {
      return [
        "TASK_ASSIGNED",
        "TASK_STARTED",
        "TASK_RESOLVED",
        "PRIORITY_URGENT",
      ].includes(item.type);
    }
    if (activeTab === "queries") {
      return ["COMMENT_CREATED", "QUERY_REPLIED"].includes(item.type);
    }
    return true;
  });

  const handleCardClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await onMarkRead(item.id);
    }
    if (item.link) {
      onClose();
      router.push(item.link);
    }
  };

  // Helper for notification type visuals
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "TASK_RESOLVED":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          label: "Task Resolved",
        };
      case "TASK_STARTED":
        return {
          icon: PlayCircle,
          color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
          label: "In Progress",
        };
      case "PRIORITY_URGENT":
        return {
          icon: AlertTriangle,
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
          label: "Urgent",
        };
      case "COMMENT_CREATED":
        return {
          icon: MessageSquare,
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
          label: "New Comment",
        };
      case "QUERY_REPLIED":
        return {
          icon: MessageCircle,
          color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
          label: "Query Reply",
        };
      case "TASK_ASSIGNED":
        return {
          icon: UserCheck,
          color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
          label: "Task Assigned",
        };
      case "PROJECT_ACCESS_GRANTED":
        return {
          icon: KeyRound,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          label: "Access Granted",
        };
      default:
        return {
          icon: Bell,
          color: "text-primary bg-primary/10 border-primary/20",
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
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 45) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay === 1) return "Yesterday";
      if (diffDay < 7) return `${diffDay}d ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  if (!shouldRender || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 overflow-hidden select-none ${
        isVisible ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      {/* Dimmed backdrop with smooth fade in/out */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Slide-over panel with smooth transform slide in/out */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div
          className={`w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col pointer-events-auto h-full transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
            isVisible ? "translate-x-0" : "translate-x-full"
          }`}
        >
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/70 flex items-center justify-between gap-3 bg-secondary/20">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight">Notifications</h2>
                <p className="text-[11px] text-muted-foreground">
                  Real-time updates, task handoffs & queries
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Chime Toggle */}
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  soundEnabled
                    ? "border-border/80 text-foreground hover:bg-secondary"
                    : "border-border/60 text-muted-foreground/60 hover:bg-secondary/60"
                }`}
                title={soundEnabled ? "Notification sound: Enabled" : "Notification sound: Muted"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                title="Close drawer (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* FCM Push Permission Banner (if not already granted) */}
          {pushStatus !== "granted" && (
            <div className="mx-4 mt-3 p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-foreground">Desktop Push Notifications</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Receive task completions even when tab is closed
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isRegisteringPush || pushStatus === "denied"}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isRegisteringPush ? "Enabling..." : pushStatus === "denied" ? "Blocked" : "Enable"}
              </button>
            </div>
          )}

          {/* Filter Tabs & Bulk Actions */}
          <div className="px-4 pt-3 pb-2 border-b border-border/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "all"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "unread"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] px-1 font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "tasks"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("queries")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "queries"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Queries
              </button>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              {notifications.some((n) => n.isRead) && (
                <button
                  type="button"
                  onClick={onClearRead}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-secondary transition-colors cursor-pointer"
                  title="Clear all read notifications"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Notification List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2 space-y-1">
            {filteredNotifications.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-2xl bg-secondary/50 border border-border/80 flex items-center justify-center mb-3">
                  <Inbox className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">
                  {activeTab === "unread" ? "You're all caught up!" : "No notifications yet"}
                </div>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {activeTab === "unread"
                    ? "All task updates and client queries have been reviewed."
                    : "When team members start or resolve tasks, or comment on web previews, updates will appear here instantly."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const badge = getTypeBadge(item.type);
                const IconComponent = badge.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                      item.isRead
                        ? "bg-transparent border-transparent hover:bg-secondary/40 hover:border-border/60"
                        : "bg-primary/5 border-primary/20 hover:bg-primary/10 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Icon Badge */}
                      <div
                        className={`h-8 w-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${badge.color}`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-foreground truncate">
                            {item.title}
                          </span>
                          {!item.isRead && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {item.message}
                        </p>

                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground/70">
                          {item.project && (
                            <span className="font-semibold text-foreground/80 rounded bg-secondary px-1.5 py-0.5 border border-border/60">
                              {item.project.name}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatRelativeTime(item.createdAt)}</span>
                          {item.link && (
                            <>
                              <span>•</span>
                              <span className="text-primary hover:underline flex items-center gap-1 font-medium">
                                View <ExternalLink className="h-2.5 w-2.5" />
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Item Quick Actions (Hover) */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNotification(item.id);
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-secondary transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info & Diagnostics Test Button */}
          <div className="p-3 border-t border-border/60 bg-secondary/10 flex items-center justify-between text-[11px] text-muted-foreground px-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live SSE Active
            </span>
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
              className="px-2.5 py-1 rounded-lg bg-secondary border border-border/80 text-foreground/80 hover:text-foreground hover:bg-secondary/80 text-[11px] font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Dispatch an instant test notification to verify bell, sound, and SSE stream"
            >
              {isSendingTest ? "Sending..." : "Send Test Alert"}
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
