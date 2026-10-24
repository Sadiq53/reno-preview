"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { NotificationItem } from "./NotificationDrawer";
import { requestFcmToken } from "@/lib/firebase";

export interface ActiveToast {
  id: string;
  notification: NotificationItem;
  autoDismissMs?: number;
  unreadTotal?: number;
  isInitialWelcome?: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  activeToasts: ActiveToast[];
  addToast: (
    notif: NotificationItem,
    options?: { autoDismissMs?: number; unreadTotal?: number; isInitialWelcome?: boolean }
  ) => void;
  dismissToast: (id: string) => void;
  handleMarkRead: (id: string) => Promise<void>;
  handleMarkAllRead: () => Promise<void>;
  handleClearRead: () => Promise<void>;
  handleDeleteNotification: (id: string) => Promise<void>;
  soundEnabled: boolean;
  toggleSound: () => void;
  playChime: () => void;
  fetchNotifications: () => Promise<void>;
  pushPermission: NotificationPermission | "unsupported";
  requestPushPermission: () => Promise<boolean>;
  showPushPrompt: boolean;
  dismissPushPrompt: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize sound preference & push permission from localStorage/window
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      } else {
        setPushPermission("unsupported");
      }
      const stored =
        localStorage.getItem("vanguard_notifications_sound_enabled") ??
        localStorage.getItem("reno_notifications_sound_enabled");
      if (stored !== null) {
        setSoundEnabled(stored === "true");
      }
    }
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("vanguard_notifications_sound_enabled", String(next));
      }
      return next;
    });
  };

  // Harmonious, non-disturbable dual-frequency chime using Web Audio API
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: B5 (987.77 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(987.77, now + 0.09);
      gain2.gain.setValueAtTime(0.1, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.45);
    } catch {
      // Audio context restricted or blocked
    }
  }, [soundEnabled]);

  // Toast Queue Helpers
  const addToast = useCallback(
    (
      notif: NotificationItem,
      options?: { autoDismissMs?: number; unreadTotal?: number; isInitialWelcome?: boolean }
    ) => {
      // Record in sessionStorage to prevent repeated toast on page reload
      if (typeof window !== "undefined") {
        try {
          const raw =
            sessionStorage.getItem("vanguard_shown_toast_ids") ||
            sessionStorage.getItem("reno_shown_toast_ids");
          const ids = raw ? JSON.parse(raw) : [];
          if (!ids.includes(notif.id)) {
            ids.push(notif.id);
            sessionStorage.setItem("vanguard_shown_toast_ids", JSON.stringify(ids));
          }
        } catch {}
      }

      const toastId = `${notif.id}-${Date.now()}`;
      const newToast: ActiveToast = {
        id: toastId,
        notification: notif,
        autoDismissMs: options?.autoDismissMs ?? 9000,
        unreadTotal: options?.unreadTotal,
        isInitialWelcome: options?.isInitialWelcome,
      };

      setActiveToasts((prev) => {
        // Limit to max 3 concurrent visible toasts to prevent screen crowding
        const filtered = prev.filter((t) => t.notification.id !== notif.id);
        const updated = [newToast, ...filtered];
        return updated.slice(0, 3);
      });
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch notifications list & unread count (silent on page reload - no auto-toast/chime)
  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/notifications?limit=40");
      if (res.ok) {
        const data = await res.json();
        const list: NotificationItem[] = data.notifications || [];
        const count: number = data.unreadCount || 0;

        setNotifications(list);
        setUnreadCount(count);
      }
    } catch (err) {
      console.warn("[Notifications] Failed to load notifications:", err);
    }
  }, [session]);

  // Request Desktop Web Push notification permission and register FCM token
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    try {
      const token = await requestFcmToken();
      if (token) {
        setPushPermission("granted");
        setShowPushPrompt(false);
        return true;
      } else {
        const perm = Notification.permission;
        setPushPermission(perm);
        if (perm === "denied") {
          setShowPushPrompt(false);
        }
        return perm === "granted";
      }
    } catch (err) {
      console.warn("[Push Permission Error]:", err);
      return false;
    }
  }, []);

  const dismissPushPrompt = useCallback(() => {
    setShowPushPrompt(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("vanguard_push_prompt_dismissed", "true");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchNotifications();

      // Ensure FCM background Web Push token is synchronized
      if (typeof window !== "undefined" && "Notification" in window) {
        const perm = Notification.permission;
        setPushPermission(perm);

        if (perm === "granted") {
          requestFcmToken().catch(() => {});
        } else if (perm === "default") {
          const dismissed = sessionStorage.getItem("vanguard_push_prompt_dismissed");
          if (!dismissed) {
            const timer = setTimeout(() => setShowPushPrompt(true), 1200);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [status, fetchNotifications]);

  // Connect to Real-time SSE Stream (/api/notifications/stream)
  useEffect(() => {
    if (status !== "authenticated") return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/notifications/stream");

        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (
              (payload.type === "notification" || payload.type === "NOTIFICATION_RECEIVED") &&
              payload.notification
            ) {
              const newNotif: NotificationItem = payload.notification;

              // Prepend to notifications list avoiding duplicates
              setNotifications((prev) => {
                if (prev.some((n) => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
              });
              setUnreadCount((prev) => prev + 1);

              // Instantly pop up in-app notification message on bottom-right!
              addToast(newNotif, { autoDismissMs: 9000 });

              // Play chime
              playChime();
            }
          } catch {
            // Ignore non-json pings
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Attempt graceful reconnect after 5s
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.warn("[Notifications] SSE connection failed:", err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [status, addToast, playChime]);

  // Mark single notification as read
  const handleMarkRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.warn("[Notifications] Failed to mark read:", err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setActiveToasts([]);

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch (err) {
      console.warn("[Notifications] Failed to mark all read:", err);
    }
  };

  // Clear all read notifications
  const handleClearRead = async () => {
    try {
      setNotifications((prev) => prev.filter((n) => !n.isRead));

      await fetch("/api/notifications?clearRead=true", {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[Notifications] Failed to clear read:", err);
    }
  };

  // Delete individual notification
  const handleDeleteNotification = async (id: string) => {
    try {
      const item = notifications.find((n) => n.id === id);
      if (item && !item.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setActiveToasts((prev) => prev.filter((t) => t.notification.id !== id));

      await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[Notifications] Failed to delete notification:", err);
    }
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        activeToasts,
        addToast,
        dismissToast,
        handleMarkRead,
        handleMarkAllRead,
        handleClearRead,
        handleDeleteNotification,
        soundEnabled,
        toggleSound,
        playChime,
        fetchNotifications,
        pushPermission,
        requestPushPermission,
        showPushPrompt,
        dismissPushPrompt,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
