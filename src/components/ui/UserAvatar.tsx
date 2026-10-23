"use client";

import React, { useState } from "react";
import { getUserAvatarUrl } from "@/lib/avatars";
import { ShieldAlert } from "lucide-react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface UserAvatarProps {
  user?: {
    name?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
    email?: string | null;
    status?: string | null;
  } | null;
  size?: AvatarSize;
  className?: string;
  showStatusIndicator?: boolean;
  withRing?: boolean;
  alt?: string;
}

const SIZE_CONFIGS: Record<AvatarSize, { container: string; img: string; text: string; badge: string }> = {
  xs: {
    container: "h-6 w-6",
    img: "h-5 w-5",
    text: "text-[9px]",
    badge: "h-2 w-2 ring-1",
  },
  sm: {
    container: "h-8 w-8",
    img: "h-7 w-7",
    text: "text-xs",
    badge: "h-2.5 w-2.5 ring-1.5",
  },
  md: {
    container: "h-10 w-10",
    img: "h-9 w-9",
    text: "text-sm",
    badge: "h-3 w-3 ring-2",
  },
  lg: {
    container: "h-12 w-12",
    img: "h-11 w-11",
    text: "text-base",
    badge: "h-3.5 w-3.5 ring-2",
  },
  xl: {
    container: "h-16 w-16",
    img: "h-15 w-15",
    text: "text-xl",
    badge: "h-4 w-4 ring-2",
  },
  "2xl": {
    container: "h-20 w-20",
    img: "h-19 w-19",
    text: "text-2xl",
    badge: "h-5 w-5 ring-3",
  },
};

export default function UserAvatar({
  user,
  size = "md",
  className = "",
  showStatusIndicator = false,
  withRing = true,
  alt,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const avatarUrl = getUserAvatarUrl(user);
  const isSuspended = user?.status === "SUSPENDED";

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={`relative inline-flex shrink-0 ${cfg.container} ${className}`}>
      {/* Avatar Container with Gradient Border */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden transition-all ${
          isSuspended
            ? "bg-destructive/20 border border-destructive/40"
            : withRing
            ? "bg-gradient-to-tr from-primary to-accent p-[2px] shadow-2xs"
            : "bg-secondary border border-border"
        }`}
      >
        {!hasError ? (
          <img
            src={avatarUrl}
            alt={alt || displayName}
            onError={() => setHasError(true)}
            className={`w-full h-full rounded-full object-cover bg-secondary ${
              isSuspended ? "grayscale opacity-80" : ""
            }`}
          />
        ) : (
          <div className={`w-full h-full rounded-full flex items-center justify-center bg-primary text-primary-foreground font-bold font-display ${cfg.text}`}>
            {initial}
          </div>
        )}
      </div>

      {/* Status Indicator Badge */}
      {showStatusIndicator && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-card ${cfg.badge} ${
            isSuspended
              ? "bg-destructive ring-card"
              : "bg-emerald-500 ring-card"
          }`}
          title={isSuspended ? "Account Suspended" : "Active"}
        />
      )}

      {/* Suspended Small Icon Overlay for Larger Sizes */}
      {isSuspended && (size === "lg" || size === "xl" || size === "2xl") && (
        <span
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm ring-2 ring-card"
          title="Account Suspended"
        >
          <ShieldAlert className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
