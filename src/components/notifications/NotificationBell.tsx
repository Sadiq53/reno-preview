"use client";

import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import NotificationDrawer from "./NotificationDrawer";
import { useNotifications } from "./NotificationContext";

interface NotificationBellProps {
  className?: string;
  buttonClassName?: string;
}

export default function NotificationBell({
  className = "",
  buttonClassName = "",
}: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    handleMarkRead,
    handleMarkAllRead,
    handleClearRead,
    handleDeleteNotification,
    soundEnabled,
    toggleSound,
  } = useNotifications();

  const [isWiggling, setIsWiggling] = useState(false);
  const prevUnreadRef = React.useRef(unreadCount);

  // Wiggle the bell when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setIsWiggling(true);
      const timer = setTimeout(() => setIsWiggling(false), 900);
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="reno-notifications-bell-btn"
        onClick={() => (isDrawerOpen ? closeDrawer() : openDrawer())}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shadow-xs ${
          unreadCount > 0 ? "text-foreground border-primary/40 bg-primary/5" : ""
        } ${isWiggling ? "animate-bounce" : ""} ${buttonClassName}`}
        title={`Notifications (${unreadCount} unread)`}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="h-4 w-4" />

        {/* Pulsing Unread Badge Counter */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 shadow-sm">
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
            <span className="relative">{unreadCount > 99 ? "99+" : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Slide-over Notification Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onClearRead={handleClearRead}
        onDeleteNotification={handleDeleteNotification}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />
    </div>
  );
}
