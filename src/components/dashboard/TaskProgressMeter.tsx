"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export interface TaskProgressMeterProps {
  total: number;
  resolved: number;
  inProgress?: number;
  pending?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showBreakdown?: boolean;
  showLabel?: boolean;
  className?: string;
}

export default function TaskProgressMeter({
  total = 0,
  resolved = 0,
  inProgress = 0,
  pending = 0,
  size = "md",
  showBreakdown = true,
  showLabel = true,
  className = "",
}: TaskProgressMeterProps) {
  // Calculate percentages safely
  const resolvedPercent = total > 0 ? Math.min(100, Math.round((resolved / total) * 100)) : 0;
  const inProgressPercent =
    total > 0 ? Math.min(100 - resolvedPercent, Math.round((inProgress / total) * 100)) : 0;
  const pendingCount = pending || Math.max(0, total - resolved - inProgress);

  // Height configurations
  const heightClasses = {
    xs: "h-1.5",
    sm: "h-2",
    md: "h-2.5",
    lg: "h-3.5",
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Top Label & Overall Percentage Header */}
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span>Resolution Progress:</span>
            <span className="font-semibold text-foreground font-display">
              {resolved} / {total} {total === 1 ? "task" : "tasks"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {total > 0 && resolved === total && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <Sparkles className="h-3 w-3" /> All Done!
              </span>
            )}
            <span
              className={`font-mono font-bold text-xs ${
                resolvedPercent === 100
                  ? "text-emerald-600"
                  : resolvedPercent > 50
                  ? "text-primary"
                  : "text-amber-600"
              }`}
            >
              {resolvedPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Multi-Segmented Progress Bar */}
      <div
        className={`w-full overflow-hidden rounded-full bg-secondary border border-border/80 flex ${heightClasses[size]}`}
      >
        {/* Resolved Segment */}
        {resolvedPercent > 0 && (
          <div
            style={{ width: `${resolvedPercent}%` }}
            className="h-full bg-emerald-500 transition-all duration-500 ease-out shadow-xs"
            title={`${resolved} Resolved (${resolvedPercent}%)`}
          />
        )}

        {/* In-Progress Segment */}
        {inProgressPercent > 0 && (
          <div
            style={{ width: `${inProgressPercent}%` }}
            className="h-full bg-primary transition-all duration-500 ease-out"
            title={`${inProgress} In Progress (${inProgressPercent}%)`}
          />
        )}
      </div>

      {/* Detailed Breakdown Legend Pills */}
      {showBreakdown && total > 0 && (
        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
            <span className="text-foreground font-semibold font-mono">{resolved}</span>
            <span>Resolved</span>
          </div>

          {inProgress > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary shadow-xs" />
              <span className="text-foreground font-semibold font-mono">{inProgress}</span>
              <span>In Progress</span>
            </div>
          )}

          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 shadow-xs" />
              <span className="text-foreground font-semibold font-mono">{pendingCount}</span>
              <span>Pending</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
