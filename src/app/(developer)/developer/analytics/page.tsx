"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ExternalLink,
  Flame,
  Zap,
  TrendingUp,
  RefreshCw,
  LogOut,
  Layers,
  ArrowRight,
  Loader2,
  Calendar,
  MessageSquare,
  StickyNote,
  ChevronRight,
  ListTodo,
  Check,
  ShieldCheck,
  Target
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import DeveloperHeader from "@/components/layout/DeveloperHeader";
import { MetricsRibbonSkeleton, Skeleton } from "@/components/ui/Skeleton";

interface OverviewStats {
  totalProjects: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  resolvedTasks: number;
  completionRate: number;
  urgentTasks: number;
  highTasks: number;
  mediumTasks: number;
  lowTasks: number;
  myResolvedCount: number;
  myRepliesCount: number;
}

interface AgeDistribution {
  freshCount: number;
  activeCount: number;
  agingCount: number;
  staleCount: number;
}

interface ProjectBreakdown {
  projectId: string;
  projectName: string;
  clientName: string;
  targetUrl: string;
  daysRemaining: number;
  totalTasks: number;
  pending: number;
  inProgress: number;
  resolved: number;
  urgent: number;
  high: number;
  progressPercent: number;
}

interface PriorityActionItem {
  id: string;
  content: string;
  title?: string | null;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  notes?: string | null;
  createdAt: string;
  ageHours: number;
  ageDays: number;
  projectId: string;
  projectName: string;
  clientName: string;
  pagePath: string;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  authorName: string;
  repliesCount: number;
}

interface RecentlyResolvedItem {
  id: string;
  content: string;
  resolvedAt: string;
  projectName: string;
  pagePath: string;
  resolverName: string;
}

interface AnalyticsData {
  overview: OverviewStats;
  ageDistribution: AgeDistribution;
  projectBreakdowns: ProjectBreakdown[];
  priorityQueue: PriorityActionItem[];
  recentlyResolved: RecentlyResolvedItem[];
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

function DeveloperAnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/developer/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load productivity analytics");
      }
    } catch {
      setErrorMessage("Network error connecting to analytics service");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Flame className="h-3 w-3 text-rose-600" />
            Urgent
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Zap className="h-3 w-3 text-amber-600" />
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            Low
          </span>
        );
    }
  };

  const overview = data?.overview || {
    totalProjects: 0,
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    resolvedTasks: 0,
    completionRate: 100,
    urgentTasks: 0,
    highTasks: 0,
    mediumTasks: 0,
    lowTasks: 0,
    myResolvedCount: 0,
    myRepliesCount: 0,
  };

  const ageDist = data?.ageDistribution || {
    freshCount: 0,
    activeCount: 0,
    agingCount: 0,
    staleCount: 0,
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-16">
      {/* Unified Rock-Solid Centralized Developer Header */}
      <DeveloperHeader
        user={data?.user || null}
        projects={(data?.projectBreakdowns || []).map((p) => ({
          id: p.projectId,
          name: p.projectName,
          clientName: p.clientName,
          targetUrl: p.targetUrl,
        }))}
        tasks={(data?.priorityQueue || []).map((t) => ({
          id: t.id,
          projectId: t.projectId,
          projectName: t.projectName,
          title: t.title,
          content: t.content,
          priority: t.priority,
          status: t.status,
          pagePath: t.pagePath,
        }))}
      />

      {/* Main Container (Standardized max-w-7xl) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
              <TrendingUp className="h-4 w-4" />
              <span>Developer Insights & Personal Progress Tracker</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Productivity & Workload Analytics
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Monitor project workloads, track personal resolution metrics, review task age distributions, and focus on high-priority action items.
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3.5 text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Executive Metric Scorecards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card: Total Projects */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Assigned Projects</span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-foreground">
                {overview.totalProjects}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Active client web projects
              </p>
            </div>
          </div>

          {/* Card: Total Workload */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total Workload</span>
              <ListTodo className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-foreground">
                {overview.totalTasks}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="text-amber-800 font-semibold">{overview.pendingTasks} to do</span>
                <span>&bull;</span>
                <span className="text-sky-800 font-semibold">{overview.inProgressTasks} active</span>
              </div>
            </div>
          </div>

          {/* Card: Urgent & High Tasks */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Urgent & High Priority</span>
              <Flame className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-rose-950">
                {overview.urgentTasks + overview.highTasks}
              </div>
              <p className="mt-1 text-[11px] text-rose-800 font-medium">
                {overview.urgentTasks} urgent &bull; {overview.highTasks} high priority action items
              </p>
            </div>
          </div>

          {/* Card: Resolved Tasks */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Total Resolved</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-emerald-950">
                {overview.resolvedTasks}
              </div>
              <p className="mt-1 text-[11px] text-emerald-800 font-medium">
                {overview.myResolvedCount > 0 ? `${overview.myResolvedCount} marked by you` : "Completed tasks"}
              </p>
            </div>
          </div>

          {/* Card: Personal Completion Rate */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-muted-foreground mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">Completion Rate</span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-display text-3xl font-bold text-foreground font-mono">
                  {overview.completionRate}%
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {overview.resolvedTasks} / {overview.totalTasks}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-700 rounded-full"
                  style={{ width: `${overview.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Priority Focus: Smart Action Queue ("What Should I Work On First?") */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Priority Action Queue
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Highest-impact tasks ranked dynamically by priority level and aging time. Start here to deliver immediate client value.
              </p>
            </div>

            <Link
              href="/developer/tasks"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline self-start sm:self-auto"
            >
              <span>Open Full Kanban Board</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {overview.urgentTasks + overview.highTasks === 0 && (data?.priorityQueue || []).length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mb-2" />
              <p className="font-bold text-sm text-foreground">No High-Priority Bottlenecks</p>
              <p className="mt-1 text-muted-foreground max-w-sm">
                All urgent and high-priority visual tasks across your assigned projects are resolved.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data?.priorityQueue || []).slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border/80 bg-background/50 hover:bg-card p-4 transition-all shadow-xs flex flex-col justify-between hover:shadow-md group"
                >
                  <div>
                    {/* Top Meta */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        {priorityBadge(item.priority)}
                        <span className="text-[11px] font-bold text-primary truncate max-w-[130px]">
                          {item.projectName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                        {item.pagePath}
                      </span>
                    </div>

                    {/* Task instruction */}
                    <p className="text-xs font-semibold text-foreground line-clamp-3 mb-2.5 leading-relaxed">
                      {item.content}
                    </p>

                    {/* Dev notes if present */}
                    {item.notes && (
                      <div className="mb-2.5 rounded-lg bg-emerald-50 border border-emerald-200/60 p-2 text-[11px] text-emerald-900 flex items-start gap-1.5">
                        <StickyNote className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2 italic">{item.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {item.ageDays > 0 ? `${item.ageDays}d ago` : `${item.ageHours}h ago`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/developer/tasks?projectId=${item.projectId}`}
                        className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Board
                      </Link>
                      <Link
                        href={`/preview/${item.projectId}?commentId=${item.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 px-2 py-1 text-[11px] font-bold text-primary transition-colors"
                        title="Jump to Pin in Visual Preview"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Task Age & SLA Staleness Distribution */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-border/60">
            <h2 className="font-display text-lg font-bold text-foreground">
              Task Age & Turnaround Distribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown of unresolved feedback items by age. Keep your backlog fresh and resolve older items before they age.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Fresh: < 24h */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-800">New Feedback</span>
              <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 font-mono mt-1">
                {ageDist.freshCount}
              </div>
              <p className="text-[11px] text-emerald-800 mt-1 font-medium">&lt; 24 hours old</p>
            </div>

            {/* Active: 1-3 days */}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-sky-800">Active Window</span>
              <div className="font-display text-2xl sm:text-3xl font-bold text-sky-950 font-mono mt-1">
                {ageDist.activeCount}
              </div>
              <p className="text-[11px] text-sky-800 mt-1 font-medium">1 &ndash; 3 days old</p>
            </div>

            {/* Aging: 4-7 days */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-800">Aging Tasks</span>
              <div className="font-display text-2xl sm:text-3xl font-bold text-amber-950 font-mono mt-1">
                {ageDist.agingCount}
              </div>
              <p className="text-[11px] text-amber-800 mt-1 font-medium">4 &ndash; 7 days old</p>
            </div>

            {/* Stale: > 7 days */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-800">Stale / Attention</span>
              <div className="font-display text-2xl sm:text-3xl font-bold text-rose-950 font-mono mt-1">
                {ageDist.staleCount}
              </div>
              <p className="text-[11px] text-rose-800 mt-1 font-medium">&gt; 7 days without resolution</p>
            </div>
          </div>
        </div>

        {/* 4. Per-Project Workload Matrix ("Each project holds how many tasks, urgent, resolved") */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Per-Project Workload Matrix
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Granular progress metrics and task density across each of your assigned client web projects.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {data?.projectBreakdowns?.length || 0} Projects Assigned
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Project & Client</th>
                  <th className="py-3 px-3 font-bold text-center">Access Expiry</th>
                  <th className="py-3 px-3 font-bold text-center">Total Tasks</th>
                  <th className="py-3 px-3 font-bold text-center text-rose-700">Urgent</th>
                  <th className="py-3 px-3 font-bold text-center text-amber-700">Pending</th>
                  <th className="py-3 px-3 font-bold text-center text-sky-700">In Progress</th>
                  <th className="py-3 px-3 font-bold text-center text-emerald-700">Resolved</th>
                  <th className="py-3 px-4 font-bold">Progress</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(data?.projectBreakdowns || []).map((proj) => (
                  <tr key={proj.projectId} className="hover:bg-secondary/30 transition-colors">
                    {/* Project & Client */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sm text-foreground">{proj.projectName}</div>
                      <div className="text-[11px] text-muted-foreground">{proj.clientName}</div>
                    </td>

                    {/* Expiry */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-mono text-amber-900">
                        <Clock className="h-3 w-3" />
                        {proj.daysRemaining}d left
                      </span>
                    </td>

                    {/* Total Tasks */}
                    <td className="py-3.5 px-3 text-center font-bold font-mono text-foreground">
                      {proj.totalTasks}
                    </td>

                    {/* Urgent */}
                    <td className="py-3.5 px-3 text-center">
                      {proj.urgent > 0 ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 text-[11px]">
                          {proj.urgent}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 font-mono">&mdash;</span>
                      )}
                    </td>

                    {/* Pending */}
                    <td className="py-3.5 px-3 text-center font-mono text-amber-900 font-semibold">
                      {proj.pending}
                    </td>

                    {/* In Progress */}
                    <td className="py-3.5 px-3 text-center font-mono text-sky-900 font-semibold">
                      {proj.inProgress}
                    </td>

                    {/* Resolved */}
                    <td className="py-3.5 px-3 text-center font-mono text-emerald-900 font-semibold">
                      {proj.resolved}
                    </td>

                    {/* Progress Bar */}
                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-foreground">{proj.progressPercent}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-500 rounded-full"
                          style={{ width: `${proj.progressPercent}%` }}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/developer/tasks?projectId=${proj.projectId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                          title="Open Task Board for this project"
                        >
                          <FolderKanban className="h-3.5 w-3.5 text-primary" />
                          <span>Board</span>
                        </Link>
                        <Link
                          href={`/preview/${proj.projectId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                          title="Open Visual Preview"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          <span>Preview</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Personal Activity & Recent Resolutions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Resolutions */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-border/60">
              <h2 className="font-display text-base font-bold text-foreground">
                Recent Task Resolutions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest visual feedback items marked as resolved.
              </p>
            </div>

            {(data?.recentlyResolved || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No tasks resolved recently.
              </p>
            ) : (
              <div className="space-y-3">
                {(data?.recentlyResolved || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/60 bg-secondary/20"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-foreground line-clamp-1">
                          {item.content}
                        </p>
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span>{item.projectName}</span>
                          <span>&bull;</span>
                          <span className="font-mono">{item.pagePath}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {new Date(item.resolvedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Personal Developer Engagement Stats */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-border/60">
              <h2 className="font-display text-base font-bold text-foreground">
                Personal Engagement & Audit Summary
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your collaboration velocity across threaded queries and technical notes.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Personal Resolutions</div>
                    <div className="text-[11px] text-muted-foreground">Tasks resolved by your account</div>
                  </div>
                </div>
                <span className="font-display text-xl font-bold text-foreground font-mono">
                  {overview.myResolvedCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Queries & Replies Posted</div>
                    <div className="text-[11px] text-muted-foreground">Responses sent to clients/reviewers</div>
                  </div>
                </div>
                <span className="font-display text-xl font-bold text-sky-900 font-mono">
                  {overview.myRepliesCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Security Sandbox Status</div>
                    <div className="text-[11px] text-muted-foreground">Zero-Trust WordPress Access active</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Secured
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DeveloperAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <MetricsRibbonSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <DeveloperAnalyticsContent />
    </Suspense>
  );
}
