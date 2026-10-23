"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowLeft,
  MousePointer,
  MessageSquare,
  Search,
  ChevronDown,
  Eye,
  EyeOff,
  Share2,
  RefreshCw,
} from "lucide-react";
import styles from "./TopBar.module.css";
import NotificationBell from "@/components/notifications/NotificationBell";

export interface PageOption {
  id: string;
  path: string;
  title: string;
  fullUrl: string;
  isDefault?: boolean;
  commentCount?: number;
}

export interface ViewportOption {
  width: number;
  height: number;
}

export interface TopBarProps {
  pages: PageOption[];
  activePageId: string;
  onPageSelect: (pageId: string) => void;
  onRefreshPages?: () => Promise<void> | void;
  isRefreshingPages?: boolean;
  projectName?: string;
  clientName?: string;
  activeDevice: "desktop" | "tablet" | "mobile";
  onDeviceSelect: (device: "desktop" | "tablet" | "mobile") => void;
  viewportSize: ViewportOption;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  onResetZoom?: () => void;
  activeMode: "browse" | "comment" | "inspect";
  onModeChange: (mode: "browse" | "comment" | "inspect") => void;
  commentCount?: number;
  resolvedCount?: number;
  hideResolved?: boolean;
  onToggleHideResolved?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  backHref?: string | null;
  onOpenShare?: () => void;
  roleBadge?: React.ReactNode;
  allowedModes?: ("browse" | "comment" | "inspect")[];
  showNotifications?: boolean;
}

export default function TopBar({
  pages = [],
  activePageId,
  onPageSelect,
  onRefreshPages,
  isRefreshingPages = false,
  projectName = "Client Project",
  clientName,
  activeDevice,
  onDeviceSelect,
  viewportSize,
  zoomLevel,
  onZoomChange,
  onResetZoom,
  activeMode,
  onModeChange,
  commentCount = 0,
  resolvedCount = 0,
  hideResolved = false,
  onToggleHideResolved,
  isSidebarOpen = false,
  onToggleSidebar,
  isFullscreen = false,
  onToggleFullscreen,
  backHref,
  onOpenShare,
  roleBadge,
  allowedModes,
  showNotifications = true,
}: TopBarProps) {
  const modes = allowedModes || ["browse", "comment", "inspect"];

  return (
    <header className={styles.topbarContainer}>
      {/* Left: Brand Icon, Project & Page Dropdown, Unified Comments Pill */}
      <div className={styles.topbarLeft}>
        {/* Back Button & Vanguard Shield Icon Logo */}
        {backHref ? (
          <Link
            href={backHref}
            className={styles.brandIconBtn}
            title="Back to Project Directory"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <div className={styles.iconLogoWrapper} title="Crewvia Vanguard">
              <Image
                src="/logo/vanguard-icon.png"
                alt="Crewvia Vanguard"
                width={20}
                height={20}
                className="h-4.5 w-4.5 object-contain"
                priority
              />
            </div>
          </Link>
        ) : (
          <div className={styles.iconLogoWrapper} title="Crewvia Vanguard">
            <Image
              src="/logo/vanguard-icon.png"
              alt="Crewvia Vanguard"
              width={20}
              height={20}
              className="h-4.5 w-4.5 object-contain"
              priority
            />
          </div>
        )}

        {/* Project / Page Breadcrumb Pill */}
        <div className={styles.breadcrumbWrapper}>
          <span
            className={styles.projectName}
            title={clientName ? `${projectName} (${clientName})` : projectName}
          >
            {projectName}
          </span>
          {pages.length > 0 && <span className={styles.breadcrumbDivider}>/</span>}

          {pages.length > 0 && (
            <div className="flex items-center gap-1">
              <div className={styles.pageSelectorWrapper}>
                <select
                  value={activePageId}
                  onChange={(e) => onPageSelect(e.target.value)}
                  className={styles.pageDropdown}
                  aria-label="Select preview page"
                >
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className={styles.dropdownArrow} />
              </div>

              {onRefreshPages && (
                <button
                  type="button"
                  onClick={onRefreshPages}
                  disabled={isRefreshingPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
                  title="Re-fetch & sync website pages"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshingPages ? "animate-spin text-primary" : ""}`} />
                </button>
              )}
            </div>
          )}
        </div>

        {roleBadge && (
          <div className="flex items-center">
            {roleBadge}
          </div>
        )}

        {/* Unified Feedback Comments & Progress Pill */}
        {onToggleSidebar && (
          <div className={styles.feedbackPillGroup}>
            <button
              onClick={onToggleSidebar}
              className={`${styles.feedbackPill} ${
                isSidebarOpen ? styles.feedbackPillActive : ""
              }`}
              title="Toggle feedback annotations drawer (Shortcut: C)"
            >
              <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold text-foreground">
                {commentCount}
              </span>
              {commentCount > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({resolvedCount}/{commentCount} done)
                </span>
              )}
            </button>

            {/* Visibility Toggle for Resolved Pins */}
            {onToggleHideResolved && commentCount > 0 && (
              <button
                type="button"
                onClick={onToggleHideResolved}
                className={styles.iconActionBtn}
                title={hideResolved ? "Show resolved pins" : "Hide resolved pins"}
              >
                {hideResolved ? (
                  <EyeOff className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: Clean Segmented Mode Switcher */}
      {modes.length > 0 && (
        <div className={styles.topbarCenter}>
          <div className={styles.modeToggle}>
            {modes.includes("browse") && (
              <button
                type="button"
                className={`${styles.modeBtn} ${
                  activeMode === "browse" ? styles.modeBtnActive : ""
                }`}
                onClick={() => onModeChange("browse")}
                title="Browse Mode (Shortcut: B)"
              >
                <MousePointer className="h-3.5 w-3.5" />
                <span className={styles.modeLabel}>Browse</span>
              </button>
            )}

            {modes.includes("comment") && (
              <button
                type="button"
                className={`${styles.modeBtn} ${
                  activeMode === "comment" ? styles.modeBtnActive : ""
                }`}
                onClick={() => onModeChange("comment")}
                title="Comment Mode (Shortcut: C)"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className={styles.modeLabel}>Comment</span>
              </button>
            )}

            {modes.includes("inspect") && (
              <button
                type="button"
                className={`${styles.modeBtn} ${
                  activeMode === "inspect" ? styles.modeBtnActive : ""
                }`}
                onClick={() => onModeChange("inspect")}
                title="Inspect Mode (Shortcut: I)"
              >
                <Search className="h-3.5 w-3.5" />
                <span className={styles.modeLabel}>Inspect</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Right: Viewports, Zoom, Share CTA, Fullscreen & Bell */}
      <div className={styles.topbarRight}>
        {/* Device Switcher */}
        <div className={styles.deviceGroup}>
          <button
            type="button"
            className={`${styles.deviceBtn} ${
              activeDevice === "desktop" ? styles.deviceBtnActive : ""
            }`}
            onClick={() => onDeviceSelect("desktop")}
            title="Desktop Viewport (1440 × 900)"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={`${styles.deviceBtn} ${
              activeDevice === "tablet" ? styles.deviceBtnActive : ""
            }`}
            onClick={() => onDeviceSelect("tablet")}
            title="Tablet Viewport (768 × 1024)"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={`${styles.deviceBtn} ${
              activeDevice === "mobile" ? styles.deviceBtnActive : ""
            }`}
            onClick={() => onDeviceSelect("mobile")}
            title="Mobile Viewport (375 × 667)"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Compact Zoom Control */}
        <div className={styles.zoomPill}>
          <button
            type="button"
            className={styles.zoomStepBtn}
            onClick={() => {
              if (zoomLevel === -1) onZoomChange(75);
              else onZoomChange(Math.max(25, zoomLevel - 15));
            }}
            disabled={zoomLevel > 0 && zoomLevel <= 25}
            title="Zoom Out"
          >
            <ZoomOut className="h-3 w-3" />
          </button>

          <button
            type="button"
            className={styles.zoomLabelBtn}
            onClick={onResetZoom}
            title={
              zoomLevel === -1
                ? "Click to switch to 100% actual size"
                : "Click to Auto-Fit screen"
            }
          >
            {zoomLevel === -1 ? "Fit" : `${zoomLevel}%`}
          </button>

          <button
            type="button"
            className={styles.zoomStepBtn}
            onClick={() => {
              if (zoomLevel === -1) onZoomChange(100);
              else onZoomChange(Math.min(200, zoomLevel + 15));
            }}
            disabled={zoomLevel >= 200}
            title="Zoom In"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
        </div>

        {/* Primary Share CTA */}
        {onOpenShare && (
          <button
            type="button"
            onClick={onOpenShare}
            className={styles.shareBtn}
            title="Generate Client Share Link"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Fullscreen Toggle */}
        {onToggleFullscreen && (
          <button
            id="topbar-fullscreen-btn"
            data-testid="fullscreen-btn"
            type="button"
            className={styles.iconActionBtn}
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Real-time Notification Center (Only visible for Owner & Dev workspaces, omitted from client preview) */}
        {showNotifications && <NotificationBell />}
      </div>
    </header>
  );
}
