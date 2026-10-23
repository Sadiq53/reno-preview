"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  ShieldCheck,
  Plus,
  ArrowRight,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Activity,
  Layers,
  Sparkles,
  Loader2,
  UserCheck
} from "lucide-react";
import { signOut } from "next-auth/react";
import ProjectCard, { ProjectCardData } from "@/components/dashboard/ProjectCard";
import ShareModal from "@/components/dashboard/ShareModal";
import { MetricsRibbonSkeleton, ProjectsGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

interface ProjectStats {
  id: string;
  name: string;
  clientName: string;
  targetUrl: string;
  status: string;
  pageCount: number;
  assignmentCount: number;
  taskStats: {
    total: number;
    resolved: number;
    pending: number;
    inProgress: number;
    progressPercent: number;
  };
  activeAssignees: Array<{ id: string; name: string; avatarUrl: string | null }>;
}

interface AuditItem {
  id: string;
  action: string;
  timestamp: string;
  userName: string;
  userRole: string;
  projectName: string | null;
}

interface DeveloperItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  assignmentCount: number;
}

interface DashboardData {
  metrics: {
    totalProjects: number;
    totalPages: number;
    totalTasks: number;
    resolvedTasks: number;
    pendingTasks: number;
    overallProgressPercent: number;
    totalDevelopers: number;
    activeAssignments: number;
  };
  recentProjects: ProjectStats[];
  recentLogs: AuditItem[];
  developers: DeveloperItem[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [shareProject, setShareProject] = useState<ProjectCardData | null>(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load dashboard data");
      }
    } catch {
      setErrorMessage("Network error connecting to dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatActionName = (action: string) => {
    return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Welcome & System Status Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Agency Owner Command Center &bull; Zero-Trust Access Sentinel Armed</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Operations & Project Oversight
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Oversee client website workspaces, review visual canvas pins, track task milestones, and govern secure access grants.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            <MetricsRibbonSkeleton count={4} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-40 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                </div>
                <ProjectsGridSkeleton count={2} />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-5 w-32 rounded-md" />
                <Skeleton className="h-80 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Global Executive Metrics Ribbon */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {/* Active Projects */}
              <Link
                href="/admin/projects"
                className="group rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                    Active Projects
                  </span>
                  <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <FolderKanban className="size-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{data.metrics.totalProjects}</span>
                  <span className="text-xs text-muted-foreground">websites</span>
                </div>
                <div className="mt-2 text-[11px] text-primary font-semibold flex items-center gap-1">
                  <span>Manage Projects Directory</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>

              {/* Developer Grants */}
              <Link
                href="/admin/team"
                className="group rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                    Contractors & Devs
                  </span>
                  <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                    <Users className="size-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{data.metrics.totalDevelopers}</span>
                  <span className="text-xs text-primary font-medium">({data.metrics.activeAssignments} active grants)</span>
                </div>
                <div className="mt-2 text-[11px] text-primary font-semibold flex items-center gap-1">
                  <span>View Team Roster</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>

              {/* Visual Task Progression */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                    Visual Task Progress
                  </span>
                  <div className="size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{data.metrics.overallProgressPercent}%</span>
                  <span className="text-xs text-muted-foreground">
                    ({data.metrics.resolvedTasks} / {data.metrics.totalTasks})
                  </span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${data.metrics.overallProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Monitored Responsive Pages */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                    Monitored Pages
                  </span>
                  <div className="size-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Layers className="size-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{data.metrics.totalPages}</span>
                  <span className="text-xs text-muted-foreground">canvas viewports</span>
                </div>
                <div className="mt-2 text-[11px] text-amber-700 font-semibold">
                  {data.metrics.pendingTasks} open feedback annotations
                </div>
              </div>
            </div>

            {/* Main Layout: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column (2 Cols wide): Active Client Projects Grid */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Client Projects & Workspaces</h2>
                    <p className="text-xs text-muted-foreground">
                      Open responsive preview canvas, manage project subpages, or grant time-bound developer access.
                    </p>
                  </div>
                  <Link
                    href="/admin/projects"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {data.recentProjects.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center">
                    <FolderKanban className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                    <h3 className="font-display text-base font-bold text-foreground">No Projects Found</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Create your first client web project to start previewing responsive pages and managing visual feedback.
                    </p>
                    <Link
                      href="/admin/projects/new"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Project Now</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.recentProjects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p as any}
                        onOpenShare={(proj) => setShareProject(proj)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Active Team & Live Audit Stream */}
              <div className="space-y-6">
                {/* Active Contractors Widget */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-sm font-bold text-foreground">Contractor Roster</h3>
                    </div>
                    <Link
                      href="/admin/team"
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Manage
                    </Link>
                  </div>

                  {data.developers.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No contractors invited yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {data.developers.map((dev) => (
                        <div
                          key={dev.id}
                          className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-display">
                              {dev.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground">{dev.name}</div>
                              <div className="text-[10px] text-muted-foreground">{dev.email}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {dev.assignmentCount} project{dev.assignmentCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href="/admin/team"
                    className="mt-4 flex items-center justify-center gap-1.5 w-full rounded-xl border border-border/80 bg-card py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Invite Contractor</span>
                  </Link>
                </div>

                {/* Live Security & Audit Feed */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-700" />
                      <h3 className="font-display text-sm font-bold text-foreground">Live Activity Stream</h3>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {data.recentLogs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No audit activity logged yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.recentLogs.map((log) => (
                        <div key={log.id} className="text-xs border-b border-border/60 pb-2.5 last:border-none">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-semibold text-foreground">
                              {formatActionName(log.action)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            By <strong className="text-foreground">{log.userName}</strong>
                            {log.projectName && <span> &bull; {log.projectName}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href="/admin/audit"
                    className="mt-4 flex items-center justify-center gap-1.5 w-full rounded-xl border border-border/80 bg-card py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-xs"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                    <span>View Complete Audit Log & Vault</span>
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : null}

      {/* Share Preview Modal */}
      {shareProject && (
        <ShareModal
          isOpen={Boolean(shareProject)}
          onClose={() => setShareProject(null)}
          projectId={shareProject.id}
          projectName={shareProject.name}
          projectClient={shareProject.client}
        />
      )}
    </div>
  );
}
