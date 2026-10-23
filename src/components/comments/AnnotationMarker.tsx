import React, { useState, useEffect } from "react";
import styles from "./AnnotationMarker.module.css";
import { X } from "lucide-react";

export interface AnnotationMarkerProps {
  id: string;
  index?: number;
  posX: number; // Percentage 0.00 to 100.00
  posY: number; // Percentage 0.00 to 100.00
  content: string;
  status?: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  user?: {
    name: string;
    avatarUrl?: string | null;
  };
  createdAt?: string;
  viewportLabel?: string;
  isSelected?: boolean;
  onSelect?: (id: string | null) => void;
}

export default function AnnotationMarker({
  id,
  index = 1,
  posX,
  posY,
  content,
  status = "PENDING",
  user,
  createdAt,
  viewportLabel,
  isSelected = false,
  onSelect,
}: AnnotationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);

  // When selected or navigated to, allow clicking outside anywhere to dismiss
  useEffect(() => {
    if (!isSelected) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicked inside this marker or inside the comment sidebar, do not dismiss
      if (
        target.closest(`[data-marker-id="${id}"]`) ||
        target.closest("[data-comment-sidebar]")
      ) {
        return;
      }
      if (onSelect) onSelect(null);
    };

    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isSelected, id, onSelect]);

  const showPopover = isSelected || isHovered;

  const getStatusClass = () => {
    switch (status) {
      case "RESOLVED":
        return styles.resolved;
      case "IN_PROGRESS":
        return styles.inProgress;
      case "PENDING":
      default:
        return styles.pending;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "RESOLVED":
        return "Resolved";
      case "IN_PROGRESS":
        return "In Progress";
      case "PENDING":
      default:
        return "Pending";
    }
  };

  const authorName = user?.name || "Client";
  const authorInitial = authorName.charAt(0).toUpperCase();

  // Smart boundary-aware tooltip placement:
  // If pin is in upper portion (posY < 26%), flip tooltip below the pin so it never clips under header/top frame
  const isNearTop = posY < 26;
  const isNearLeft = posX < 22;
  const isNearRight = posX > 78;

  const verticalClass = isNearTop ? styles.popoverBelow : styles.popoverAbove;
  const horizontalClass = isNearLeft
    ? styles.alignLeft
    : isNearRight
    ? styles.alignRight
    : styles.alignCenter;

  return (
    <div
      data-marker-id={id}
      className={`${styles.markerWrapper} ${isSelected ? styles.selected : ""}`}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onSelect) onSelect(isSelected ? null : id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Active Pulse Ring */}
      {isSelected && <div className={styles.pulseRing} />}

      {/* Precision Dot Body */}
      <div className={`${styles.dotContainer} ${getStatusClass()}`}>
        <span className={styles.dotInner} />
      </div>

      {/* Hover & Active Detail Popover */}
      {showPopover && (
        <div
          className={`${styles.markerPopover} ${verticalClass} ${horizontalClass}`}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className={styles.popoverHeader}>
            <div className={styles.popoverUser}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={authorName}
                  className={styles.popoverAvatar}
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-300">
                  {authorInitial}
                </div>
              )}
              <span className={styles.popoverUsername}>{authorName}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`${styles.statusPill} ${getStatusClass()}`}>
                {getStatusLabel()}
              </span>
              {isSelected && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onSelect) onSelect(null);
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Close tooltip"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className={styles.popoverContent}>
            {content || "No details provided"}
          </div>

          <div className={styles.popoverFooter}>
            <span>{viewportLabel || `Pin #${index}`}</span>
            <span
              className="text-rose-500 hover:text-rose-600 font-semibold cursor-pointer transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onSelect) onSelect(id);
              }}
            >
              Open Thread →
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
