"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNotifications } from "./NotificationContext";
import InAppNotificationToast from "./InAppNotificationToast";

export default function InAppToastContainer() {
  const { activeToasts, dismissToast, handleMarkRead, openDrawer } = useNotifications();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined" || !document.body || activeToasts.length === 0) {
    return null;
  }

  return createPortal(
    <div
      aria-live="polite"
      aria-label="In-App Notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-3 pointer-events-none max-w-sm sm:max-w-md w-[calc(100vw-2.5rem)] select-none"
    >
      {activeToasts.map((toast) => (
        <InAppNotificationToast
          key={toast.id}
          toast={toast}
          onDismiss={dismissToast}
          onMarkRead={handleMarkRead}
          onOpenDrawer={openDrawer}
        />
      ))}
    </div>,
    document.body
  );
}
