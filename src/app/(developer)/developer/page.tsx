"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  KeyRound, 
  Eye, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  FolderKanban,
  BarChart3,
  Flame,
  Target,
  ListTodo,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Globe,
  Shield,
  Smartphone,
  Tablet,
  Monitor,
  Search,
  Filter,
  ArrowUpRight,
  RotateCcw
} from "lucide-react";
import DeveloperHeader from "@/components/layout/DeveloperHeader";
import { LaunchWpButton } from "@/components/dashboard/LaunchWpButton";
import { Skeleton } from "@/components/ui/Skeleton";

// --- INTERFACES ---
interface PageItem {
  id: string;
  title: string;
  path: string;
  isDefault: boolean;
}

interface AssignedProject {
  assignmentId: string;
  wpRoleTemplate: "RESTRICTED_ADMIN" | "EDITOR" | "SHOP_MANAGER";
  expiresAt: string;
  hoursRemaining: number;
  daysRemaining: number;
  project: {
    id: string;
    name: string;
    category?: string;
    stage?: string;
    targetUrl: string;
    allowExtensionLogin?: boolean;
    allowProxyLogin?: boolean;
    isWpConfigured?: boolean;
    pages: PageItem[];
    taskStats: {
      total: number;
      resolved: number;
      inProgress: number;
      pending: number;
      progressPercent: number;
    };
  };
}

interface DeveloperTaskItem {
  id: string;
  projectId: string;
  title?: string | null;
  content: string;
  notes?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  page?: { id: string; path: string; title: string } | null;
  project?: { id: string; name: string; category?: string; stage?: string; targetUrl?: string } | null;
  authorUser?: { id: string; name: string; role?: string } | null;
  guestAuthorName?: string | null;
  posX?: number | null;
  posY?: number | null;
  viewportWidth?: number | null;
}

interface AnalyticsData {
  overview: {
    totalProjects: number;
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    resolvedTasks: number;
    completionRate: number;
    urgentTasks: number;
    highTasks: number;
    myResolvedCount: number;
    myRepliesCount: number;
  };
  priorityQueue: Array<{
    id: string;
    content: string;
    title?: string | null;
    priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
    status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
    createdAt: string;
    ageHours: number;
    ageDays: number;
    projectId: string;
    projectName: string;
    clientName: string;
    pagePath: string;
  }>;
}

export default function DeveloperPortalPage() {
  const [assignments, setAssignments] = useState<AssignedProject[]>([]);
  const [tasks, setTasks] = useState<DeveloperTaskItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Table filter states
  const [taskStatusFilter, setTaskStatusFilter] = useState<"ALL" | "PENDING" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [taskTableSearch, setTaskTableSearch] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [assignmentsRes, tasksRes, analyticsRes] = await Promise.all([
        fetch("/api/developer/assignments"),
        fetch("/api/developer/tasks"),
        fetch("/api/developer/analytics"),
      ]);

      if (assignmentsRes.status === 401 || tasksRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (assignmentsRes.ok) {
        const aData = await assignmentsRes.json();
        setAssignments(aData.assignments || []);
        setUser(aData.user || null);
      }

      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(tData.tasks || []);
      }

      if (analyticsRes.ok) {
        const anData = await analyticsRes.json();
        setAnalytics(anData);
      }
    } catch {
      setErrorMessage("Network error connecting to developer workspace");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED") => {
    try {
      const res = await fetch(`/api/comments/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch {
      console.error("Failed to update task status");
    }
  };

  // Safe fallback metrics
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const resolvedTasks = tasks.filter((t) => t.status === "RESOLVED").length;
  const completionRate = totalTasks > 0 ? Math.round((resolvedTasks / totalTasks) * 100) : 100;
  const urgentTasksCount = tasks.filter((t) => (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "RESOLVED").length;

  // Filtered tasks for the dashboard table
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesStatus = taskStatusFilter === "ALL" || t.status === taskStatusFilter;
      const q = taskTableSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.content.toLowerCase().includes(q) ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.project?.name && t.project.name.toLowerCase().includes(q)) ||
        (t.page?.path && t.page.path.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [tasks, taskStatusFilter, taskTableSearch]);

  // Format relative time concisely
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return "Just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      const days = Math.floor(diff / 86400);
      return days === 1 ? "Yesterday" : `${days}d ago`;
    } catch {
      return "";
    }
  };

  // Prepared data for scoped search
  const scopedProjects = useMemo(() => {
    return assignments.map((a) => ({
      id: a.project.id,
      name: a.project.name,
      category: a.project.category,
      stage: a.project.stage,
      targetUrl: a.project.targetUrl,
      pages: a.project.pages,
    }));
  }, [assignments]);

  const scopedTasks = useMemo(() => {
    return tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      projectName: t.project?.name,
      title: t.title,
      content: t.content,
      priority: t.priority,
      status: t.status,
      pagePath: t.page?.path,
    }));
  }, [tasks]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 1. Rock-Solid Centralized Developer Header (with Scoped Global Search) */}
      <DeveloperHeader
        user={user}
        projects={scopedProjects}
        tasks={scopedTasks}
      />

      {/* Main Workspace Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Workspace Title & Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Developer Sandbox
              </span>
              <span className="text-muted-foreground/40">&bull;</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Zero-Trust Active
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Workspace Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active client workspaces, assigned visual annotations, and zero-trust sandbox sessions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3.5 text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh workspace data"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/developer/tasks"
              className="inline-flex items-center gap-1.5 h-9 rounded-xl bg-primary hover:bg-primary/90 px-3.5 text-xs font-semibold text-primary-foreground transition-all shadow-xs"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              <span>Task Board</span>
            </Link>
          </div>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2. Executive KPI Metrics Strip - Clean, Compact, No AI Gimmicks */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Assigned Workspaces */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Assigned Workspaces
              </span>
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-foreground">
                {assignments.length}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>
                  {assignments[0] ? `${assignments[0].daysRemaining}d remaining on ${assignments[0].project.name}` : "No active grants"}
                </span>
              </div>
            </div>
          </div>

          {/* Tile 2: Pending Tasks */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pending Tasks
              </span>
              <ListTodo className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-foreground">
                {pendingTasks}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Awaiting developer resolution
              </div>
            </div>
          </div>

          {/* Tile 3: Active in Progress */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                In Progress
              </span>
              <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-foreground">
                {inProgressTasks}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Currently under active development
              </div>
            </div>
          </div>

          {/* Tile 4: Completion Rate & Velocity */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Completion Velocity
              </span>
              <Target className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-display text-2xl font-bold text-foreground font-mono">
                  {completionRate}%
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {resolvedTasks} / {totalTasks} resolved
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Professional Two-Column Management Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Left Column (65% width on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Section A: Assigned Client Workspaces (Professional Enterprise Cards) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">
                    Assigned Workspaces
                  </h2>
                  <span className="rounded-full bg-secondary border border-border/80 px-2 py-0.5 text-[11px] font-mono text-muted-foreground font-semibold">
                    {assignments.length}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Zero-plugin WP admin access
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-xl" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-36 rounded-md" />
                            <Skeleton className="h-3 w-24 rounded-md" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-8 w-28 rounded-xl" />
                        <Skeleton className="h-8 w-32 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">No Project Assignments</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    You do not have any active project assignments. When an agency admin assigns you, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((item) => {
                    const { project } = item;
                    const stats = project.taskStats || { total: 0, resolved: 0, inProgress: 0, pending: 0, progressPercent: 100 };
                    const initial = project.name.charAt(0).toUpperCase();

                    return (
                      <div
                        key={item.assignmentId}
                        className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-slate-300 transition-colors"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Clean Monogram */}
                            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-display font-bold text-base shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-display text-base font-bold text-foreground truncate">
                                  {project.name}
                                </h3>
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground border border-border/60">
                                  {project.category || project.stage?.replace(/_/g, " ") || "Active Project"}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                  {item.wpRoleTemplate.replace("_", " ")}
                                </span>
                              </div>

                              {/* Interactive Target URL */}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                                <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <a
                                  href={project.targetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-foreground transition-colors truncate max-w-xs"
                                >
                                  {project.targetUrl}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUrl(project.targetUrl)}
                                  className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                                  title="Copy URL"
                                >
                                  {copiedUrl === project.targetUrl ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expiry Pill */}
                          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/60 px-2.5 py-1 text-xs font-mono text-muted-foreground shrink-0 self-start">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>
                              {item.hoursRemaining < 24
                                ? `${item.hoursRemaining}h remaining`
                                : `${item.daysRemaining}d remaining`}
                            </span>
                          </div>
                        </div>

                        {/* Workload Progress Bar */}
                        <div className="mb-4 rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">
                              Visual Tasks Resolution
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {stats.resolved} / {stats.total} resolved ({stats.progressPercent}%)
                            </span>
                          </div>

                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted flex">
                            <div
                              className="h-full bg-emerald-600 transition-all duration-300"
                              style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                            />
                            <div
                              className="h-full bg-sky-500 transition-all duration-300"
                              style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                            />
                            <div
                              className="h-full bg-amber-400 transition-all duration-300"
                              style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                            />
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              {stats.resolved} Resolved
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-sky-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                              {stats.inProgress} In Progress
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              {stats.pending} Pending
                            </span>
                          </div>
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/developer/tasks?projectId=${project.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors shadow-2xs"
                            >
                              <FolderKanban className="h-3.5 w-3.5 text-primary" />
                              <span>Task Board</span>
                              {stats.pending + stats.inProgress > 0 && (
                                <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[10px] font-mono font-bold text-muted-foreground border border-border/60">
                                  {stats.pending + stats.inProgress}
                                </span>
                              )}
                            </Link>

                            <Link
                              href={`/preview/${project.id}`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              <span>Visual Preview</span>
                            </Link>
                          </div>

                          <LaunchWpButton
                            projectId={project.id}
                            projectName={project.name}
                            targetUrl={project.targetUrl}
                            assignmentId={item.assignmentId}
                            allowExtensionLogin={project.allowExtensionLogin}
                            allowProxyLogin={project.allowProxyLogin}
                            isConfigured={project.isWpConfigured}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section B: Assigned Tasks Interactive Management Table */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Assigned Tasks & Visual Annotations
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pinned client feedback items requiring technical changes.
                  </p>
                </div>

                <Link
                  href="/developer/tasks"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline self-start sm:self-auto"
                >
                  <span>Open Full Kanban Board</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {/* Status Tabs & Search Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-secondary/40 p-1">
                  {(["ALL", "PENDING", "IN_PROGRESS", "RESOLVED"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTaskStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        taskStatusFilter === st
                          ? "bg-card text-foreground shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st === "ALL" ? "All" : st === "PENDING" ? "To Do" : st === "IN_PROGRESS" ? "In Progress" : "Resolved"}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={taskTableSearch}
                    onChange={(e) => setTaskTableSearch(e.target.value)}
                    placeholder="Filter tasks..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Table / List View */}
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No tasks matching the selected filters.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredTasks.slice(0, 8).map((task) => (
                    <div
                      key={task.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 rounded-xl px-2.5 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Priority Badge (Clean subtle pill, zero gimmick thick border) */}
                        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border shrink-0 mt-0.5 ${
                          task.priority === "URGENT"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : task.priority === "HIGH"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : task.priority === "MEDIUM"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {task.priority === "URGENT" && <Flame className="h-2.5 w-2.5" />}
                          <span>{task.priority}</span>
                        </span>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground line-clamp-1">
                            {task.title || task.content}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-medium text-foreground/80">{task.project?.name}</span>
                            <span>&bull;</span>
                            <span className="font-mono">{task.page?.path || "/"}</span>
                            <span>&bull;</span>
                            <span>{formatTimeAgo(task.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Status Transition & Inspect Pin */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {task.status === "PENDING" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                            className="rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Start
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(task.id, "RESOLVED")}
                            className="rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Done
                          </button>
                        )}
                        {task.status === "RESOLVED" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                            className="rounded-lg bg-secondary text-muted-foreground hover:text-foreground border border-border/80 px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Reopen
                          </button>
                        )}

                        <Link
                          href={`/preview/${task.projectId}?commentId=${task.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-card hover:bg-secondary p-1 text-muted-foreground hover:text-primary transition-colors"
                          title="Inspect Pin on Live Canvas"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Column (35% width on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. Priority Action Queue (Urgent & High Tasks) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/80">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-rose-600" />
                  <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                    Immediate Attention
                  </h3>
                </div>
                <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.2 text-[10px] font-bold font-mono">
                  {urgentTasksCount}
                </span>
              </div>

              {urgentTasksCount === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-foreground">All Priority Tasks Cleared</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No urgent bottlenecks across your assigned workspaces.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks
                    .filter((t) => (t.priority === "URGENT" || t.priority === "HIGH") && t.status !== "RESOLVED")
                    .slice(0, 4)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/80 bg-secondary/30 hover:bg-card p-3 transition-colors text-xs"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            item.priority === "URGENT" ? "text-rose-700 bg-rose-50" : "text-amber-700 bg-amber-50"
                          }`}>
                            {item.priority}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="font-medium text-foreground line-clamp-2 mb-2 leading-relaxed">
                          {item.content}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                          <span className="text-muted-foreground font-mono truncate max-w-[140px]">
                            {item.project?.name} &bull; {item.page?.path || "/"}
                          </span>
                          <Link
                            href={`/preview/${item.projectId}?commentId=${item.id}`}
                            target="_blank"
                            className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 2. Zero-Trust Security Sandbox Policy Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/80 text-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider">
                  Security Sandbox Policy
                </h3>
              </div>

              <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">Zero Master Passwords:</strong> Client credentials remain AES-256-GCM encrypted in backend vault.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">Client Files Sentinel:</strong> Plugin editor, theme editor, and admin creation endpoints are automatically blocked.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-foreground">Ephemeral Grants:</strong> Temporary 60-second grant tokens injected via Reno Companion Extension.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Keyboard Shortcuts Helper */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5 text-xs text-muted-foreground">
              <span className="font-bold uppercase tracking-wider text-[10px] text-foreground">
                Quick Shortcuts
              </span>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span>Open Global Search</span>
                  <kbd className="rounded border border-border/80 bg-secondary px-1.5 py-0.5 text-[10px] font-mono">
                    ⌘K
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Switch to Task Board</span>
                  <Link href="/developer/tasks" className="text-primary hover:underline font-medium">
                    Go to Board &rarr;
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <span>View Velocity Analytics</span>
                  <Link href="/developer/analytics" className="text-primary hover:underline font-medium">
                    View &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
