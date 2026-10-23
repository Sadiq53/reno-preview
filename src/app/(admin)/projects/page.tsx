"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FolderKanban, 
  Plus, 
  Search, 
  CheckCircle2, 
  Loader2,
  Share2,
  RefreshCw,
  Globe,
  FileText
} from "lucide-react";
import ProjectCard, { ProjectCardData } from "@/components/dashboard/ProjectCard";
import ShareModal from "@/components/dashboard/ShareModal";
import { ProjectsGridSkeleton } from "@/components/ui/Skeleton";

interface ProjectItem {
  id: string;
  name: string;
  clientName: string;
  clientId?: string;
  client?: { id: string; name: string; email: string; company?: string };
  category?: string;
  stage?: string;
  targetUrl: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  pageCount: number;
  assignmentCount: number;
  shareLinkCount: number;
  taskStats: {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    progressPercent: number;
  };
  assignments: Array<{
    id: string;
    expiresAt: string;
    revokedAt: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
  }>;
}

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [shareProject, setShareProject] = useState<ProjectCardData | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.targetUrl || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = projects.reduce((acc, p) => acc + (p.pageCount || 0), 0);
  const totalTasks = projects.reduce((acc, p) => acc + (p.taskStats?.total || 0), 0);
  const totalResolved = projects.reduce((acc, p) => acc + (p.taskStats?.resolved || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title & Stats Ribbon */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center pb-4 border-b border-border/60">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Client Projects & Staging Sites
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage website preview directories, assign contractors with time-based access, and oversee visual feedback.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchProjects}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Client Project</span>
          </Link>
        </div>
      </div>

      {/* 4-Column Metric Overview Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total Projects Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Total Projects</span>
            <div className="size-7 sm:size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FolderKanban className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-2">
            <span className="font-display text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              {projects.length}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">Managed</span>
          </div>
        </div>

        {/* Active Staging Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Active Sites</span>
            <div className="size-7 sm:size-8 rounded-xl bg-accent/20 flex items-center justify-center text-accent-foreground">
              <Globe className="size-3.5 sm:size-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-2">
            <span className="font-display text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              {projects.filter((p) => p.status === "ACTIVE").length}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Pages Monitored Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Preview Pages</span>
            <div className="size-7 sm:size-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-700">
              <FileText className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-2">
            <span className="font-display text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              {totalPages}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">Directories</span>
          </div>
        </div>

        {/* Resolved Annotations Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">Task Progress</span>
            <div className="size-7 sm:size-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="size-3.5 sm:size-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-2">
            <span className="font-display text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              {totalResolved}/{totalTasks}
            </span>
            <span className="text-[11px] sm:text-xs text-muted-foreground">Resolved</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Ribbon */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border/60">
          {(["ALL", "ACTIVE", "ARCHIVED"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === filter
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              }`}
            >
              {filter === "ALL" && "All Projects"}
              {filter === "ACTIVE" && "Active Staging"}
              {filter === "ARCHIVED" && "Archived"}
            </button>
          ))}
        </div>

        {/* Search Input Box */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects, clients, or domains..."
            className="w-full h-10 pl-10 pr-4 text-xs sm:text-sm rounded-xl border border-input bg-card text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 shadow-xs transition-colors"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <ProjectsGridSkeleton count={6} />
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/60">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="font-display text-base font-bold text-foreground">No projects found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Get started by registering your first client website project with zero-trust credentials.
          </p>
          <div className="mt-5">
            <Link
              href="/admin/projects/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Project</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpenShare={(proj) => setShareProject(proj)}
            />
          ))}
        </div>
      )}

      {/* Share Preview Modal */}
      {shareProject && (
        <ShareModal
          isOpen={Boolean(shareProject)}
          onClose={() => setShareProject(null)}
          projectId={shareProject.id}
          projectName={shareProject.name}
        />
      )}
    </div>
  );
}
