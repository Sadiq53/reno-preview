"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Globe,
  ExternalLink,
  Eye,
  Settings,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShoppingBag,
  Code2,
  FileCode,
  Smartphone,
  LayoutGrid,
  FolderKanban,
  Building2,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Sparkles
} from "lucide-react";

export interface ProjectCardData {
  id: string;
  name: string;
  clientName: string;
  clientId?: string | null;
  client?: {
    id: string;
    name: string;
    email?: string;
    company?: string | null;
  } | null;
  imageUrl?: string | null;
  stage?: string;
  category?: string;
  startDate?: string | Date | null;
  targetDate?: string | Date | null;
  targetUrl?: string | null;
  status: "ACTIVE" | "ARCHIVED" | string;
  createdAt?: string;
  pageCount?: number;
  assignmentCount?: number;
  shareLinkCount?: number;
  taskStats?: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    progressPercent: number;
  };
  assignments?: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email?: string;
      avatarUrl?: string | null;
    };
  }>;
  activeAssignees?: Array<{
    id: string;
    name: string;
    avatarUrl?: string | null;
  }>;
}

interface ProjectCardProps {
  project: ProjectCardData;
  onOpenShare?: (project: ProjectCardData) => void;
  className?: string;
}

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    gradient: string;
  }
> = {
  WORDPRESS: {
    label: "WordPress",
    icon: Globe,
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    gradient: "from-blue-600/10 via-indigo-600/5 to-transparent",
  },
  WOOCOMMERCE: {
    label: "WooCommerce",
    icon: ShoppingBag,
    color: "text-purple-500 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    gradient: "from-purple-600/10 via-pink-600/5 to-transparent",
  },
  SHOPIFY: {
    label: "Shopify",
    icon: ShoppingBag,
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    gradient: "from-emerald-600/10 via-teal-600/5 to-transparent",
  },
  WEBFLOW: {
    label: "Webflow",
    icon: LayoutGrid,
    color: "text-cyan-500 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    gradient: "from-cyan-600/10 via-blue-600/5 to-transparent",
  },
  NEXTJS: {
    label: "Next.js",
    icon: Code2,
    color: "text-slate-800 dark:text-slate-200",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    gradient: "from-slate-600/10 via-zinc-600/5 to-transparent",
  },
  REACT: {
    label: "React",
    icon: FileCode,
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    gradient: "from-sky-600/10 via-blue-600/5 to-transparent",
  },
  REACT_NATIVE: {
    label: "React Native",
    icon: Smartphone,
    color: "text-indigo-500 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    gradient: "from-indigo-600/10 via-purple-600/5 to-transparent",
  },
  CUSTOM: {
    label: "Custom App",
    icon: FolderKanban,
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    gradient: "from-amber-600/10 via-orange-600/5 to-transparent",
  },
};

const STAGE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  FULL_DEVELOPMENT: {
    label: "Full Development",
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
  },
  WORKING_ON_DEVELOPED: {
    label: "Working on Developed",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
  },
  MAINTENANCE: {
    label: "Maintenance",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  AUDIT_REVIEW: {
    label: "QA Audit & Review",
    bg: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/20",
  },
};

export default function ProjectCard({ project, onOpenShare, className = "" }: ProjectCardProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const cat = CATEGORY_CONFIG[project.category || "WORDPRESS"] || CATEGORY_CONFIG.CUSTOM;
  const CategoryIcon = cat.icon;

  const stage = STAGE_CONFIG[project.stage || "FULL_DEVELOPMENT"] || {
    label: project.stage?.replace(/_/g, " ") || "In Progress",
    bg: "bg-secondary",
    text: "text-muted-foreground",
    border: "border-border",
  };

  const clientDisplayName = project.client?.name || project.clientName || "Client Project";

  // Task metrics calculation
  const totalTasks = project.taskStats?.total || 0;
  const resolvedTasks = project.taskStats?.resolved || 0;
  const pendingTasks = project.taskStats?.pending || 0;
  const inProgressTasks = project.taskStats?.inProgress || 0;
  const progressPercent = totalTasks > 0 ? Math.round((resolvedTasks / totalTasks) * 100) : 0;

  // Assignees list normalized
  const assignees =
    project.activeAssignees ||
    (project.assignments ? project.assignments.map((a) => a.user) : []);

  // Safe delivery date & status calculation
  let deliveryLabel: string | null = null;
  let isOverdue = false;

  if (project.targetDate) {
    try {
      const d = new Date(project.targetDate);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          isOverdue = true;
          deliveryLabel = `Overdue by ${Math.abs(diffDays)}d`;
        } else if (diffDays === 0) {
          deliveryLabel = "Due today";
        } else if (diffDays === 1) {
          deliveryLabel = "Due tomorrow";
        } else if (diffDays <= 7) {
          deliveryLabel = `Due in ${diffDays}d`;
        } else {
          deliveryLabel = d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
        }
      }
    } catch {
      deliveryLabel = null;
    }
  }

  const handleCopyPreviewLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const url = `${window.location.origin}/preview/${project.id}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy preview link:", err);
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden ${className}`}
    >
      {/* Ambient Gradient Background Header */}
      <div
        className={`absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${cat.gradient} blur-3xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
      />

      {/* Optional Top Thumbnail (if uploaded) */}
      {project.imageUrl ? (
        <div className="relative w-full h-36 -mt-2 -mx-2 mb-4 rounded-2xl overflow-hidden border border-border/60 bg-muted/40 shrink-0">
          <Image
            src={project.imageUrl}
            alt={project.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          <div className="absolute top-2.5 right-2.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md border ${
                project.status === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-secondary/80 text-muted-foreground border-border"
              }`}
            >
              {project.status === "ACTIVE" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span>{project.status === "ACTIVE" ? "Active" : "Archived"}</span>
            </span>
          </div>
        </div>
      ) : null}

      {/* Main Content Body */}
      <div className="space-y-4">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Tech Category Pill */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${cat.bg} ${cat.border} ${cat.color} transition-colors`}
            >
              <CategoryIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{cat.label}</span>
            </span>

            {/* Development Stage Pill */}
            <span
              className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-semibold border ${stage.bg} ${stage.border} ${stage.text}`}
            >
              {stage.label}
            </span>
          </div>

          {/* Status Badge (when no image thumbnail) */}
          {!project.imageUrl && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                project.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              {project.status === "ACTIVE" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span>{project.status === "ACTIVE" ? "Active" : "Archived"}</span>
            </span>
          )}
        </div>

        {/* Client Tag & Project Title */}
        <div>
          {/* Client Attribution Ribbon */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary/90 mb-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate max-w-[200px]">{clientDisplayName}</span>
            {project.client?.company && project.client.company !== clientDisplayName && (
              <span className="text-[11px] font-normal text-muted-foreground truncate">
                &bull; {project.client.company}
              </span>
            )}
          </div>

          {/* Project Title with Link */}
          <Link
            href={`/admin/projects/${project.id}`}
            className="group/title block focus:outline-none"
          >
            <h3 className="font-display text-lg font-bold text-foreground group-hover/title:text-primary transition-colors tracking-tight line-clamp-1" title={project.name}>
              {project.name}
            </h3>
          </Link>
        </div>

        {/* Live Staging URL or In-Development Notice */}
        <div>
          {project.targetUrl ? (
            <a
              href={project.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors max-w-full group/link"
              title={project.targetUrl}
            >
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 group-hover/link:text-primary transition-colors" />
              <span className="truncate">{project.targetUrl.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50 group-hover/link:opacity-100 transition-opacity" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 font-mono">
              <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span>In-Development Staging Canvas</span>
            </span>
          )}
        </div>

        {/* Interactive Task Progress Panel */}
        <Link
          href={`/admin/projects/${project.id}?tab=progress`}
          className="block rounded-2xl border border-border/70 bg-secondary/30 p-3.5 hover:bg-secondary/60 hover:border-border transition-all"
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  totalTasks > 0 && resolvedTasks === totalTasks
                    ? "text-emerald-500"
                    : "text-primary"
                }`}
              />
              <span>Feedback Tasks</span>
            </span>

            {totalTasks > 0 ? (
              <span className="font-display font-bold text-xs text-foreground">
                {resolvedTasks}/{totalTasks} ({progressPercent}%)
              </span>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground">
                0 annotations
              </span>
            )}
          </div>

          {/* Progress Bar Track */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            {totalTasks > 0 ? (
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  progressPercent === 100
                    ? "bg-emerald-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.max(6, progressPercent)}%` }}
              />
            ) : (
              <div className="h-full bg-muted/40 w-full rounded-full" />
            )}
          </div>

          {/* Progress Sub-counters */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2.5">
            {totalTasks > 0 ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{pendingTasks} pending</span>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{inProgressTasks} in progress</span>
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">
                Ready for canvas visual QA
              </span>
            )}

            {project.pageCount !== undefined && (
              <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-foreground/80">
                <Layers className="h-3 w-3 text-muted-foreground" />
                <span>{project.pageCount} {project.pageCount === 1 ? "page" : "pages"}</span>
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Footer Details: Assignees, Timeline, and Action CTAs */}
      <div className="pt-4 mt-4 border-t border-border/70 space-y-3.5">
        {/* Assignees & Timeline Ribbon */}
        <div className="flex items-center justify-between text-xs gap-2">
          {/* Developer Assignees Bubble Stack */}
          <div className="flex items-center gap-1.5">
            {assignees.length > 0 ? (
              <div className="flex items-center -space-x-1.5">
                {assignees.slice(0, 3).map((dev, idx) => (
                  <div
                    key={dev.id || idx}
                    title={dev.name}
                    className="relative h-6 w-6 rounded-full border-2 border-card bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold overflow-hidden shadow-xs shrink-0 select-none"
                  >
                    <span className="absolute inset-0 flex items-center justify-center font-display">
                      {dev.name?.slice(0, 1)?.toUpperCase() || "D"}
                    </span>
                    {dev.avatarUrl && (
                      <img
                        src={dev.avatarUrl}
                        alt={dev.name}
                        className="relative z-10 h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                ))}
                {assignees.length > 3 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground">
                    +{assignees.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                <Users className="h-3 w-3 opacity-60" />
                <span>Unassigned</span>
              </span>
            )}
          </div>

          {/* Delivery Deadline Pill */}
          {deliveryLabel && (
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border font-mono ${
                isOverdue
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                  : "bg-secondary/80 text-muted-foreground border-border/80"
              }`}
              title="Target Delivery Deadline"
            >
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{deliveryLabel}</span>
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Secondary Actions (Settings, Share, Copy Link) */}
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/projects/${project.id}?tab=settings`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              title="Project Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>

            {onOpenShare && (
              <button
                type="button"
                onClick={() => onOpenShare(project)}
                className="flex h-8 px-2.5 items-center gap-1.5 rounded-xl border border-border/80 bg-card text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                title="Share Preview with Client or Team"
              >
                <Share2 className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyPreviewLink}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                copiedLink
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border/80 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              title={copiedLink ? "Link Copied!" : "Copy Interactive Preview Link"}
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Primary Action: Launch Interactive Preview Canvas */}
          <Link
            href={`/preview/${project.id}`}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-3.5 text-xs font-bold text-primary-foreground shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Interactive Preview</span>
            <ArrowRight className="h-3 w-3 opacity-80 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
