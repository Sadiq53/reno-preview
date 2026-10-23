"use client";

import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base animated shimmer Skeleton primitive
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-muted/60 dark:bg-muted/40 ${className}`}
      {...props}
    />
  );
}

/**
 * 4-Column Metric Ribbon Skeleton (Overview dashboard cards)
 */
export function MetricsRibbonSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-3.5 w-12 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single Project Card Skeleton matching ProjectCard layout perfectly
 */
export function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      {/* Top Tag Pills */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* Client Row */}
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3.5 w-32 rounded-md" />
      </div>

      {/* Title & Domain */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>

      {/* Progress Box */}
      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 space-y-2.5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-3.5 w-12 rounded-md" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="flex -space-x-1.5">
          <Skeleton className="h-6 w-6 rounded-full border-2 border-card" />
          <Skeleton className="h-6 w-6 rounded-full border-2 border-card" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Responsive Grid of Project Card Skeletons
 */
export function ProjectsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 3-Column Kanban Task Board Skeleton
 */
export function TaskBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {["Pending", "In Progress", "Resolved"].map((title, colIndex) => (
        <div key={title} className="rounded-2xl border border-border/80 bg-secondary/20 p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>

          {Array.from({ length: 3 - colIndex }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
              <div className="flex justify-between items-start gap-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-4/5 rounded-md" />
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Generic Table Rows Skeleton (for Audit Log, Team Roster, Client Lists)
 */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
      {/* Table Header */}
      <div className="border-b border-border/80 bg-secondary/40 p-4 grid grid-cols-12 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-4 rounded-md ${i === 0 ? "col-span-4" : "col-span-2"}`} />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 grid grid-cols-12 gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className={c === 0 ? "col-span-4 flex items-center gap-2.5" : "col-span-2"}>
                {c === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
                <Skeleton className={`h-3.5 rounded-md ${c === 0 ? "w-36" : "w-20"}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Detailed Project View Skeleton (/admin/projects/[id])
 */
export function ProjectDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <MetricsRibbonSkeleton count={4} />

      {/* Tabs / Content Area */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-border/70 pb-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
