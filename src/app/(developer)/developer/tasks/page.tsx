"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  Send,
  StickyNote,
  ChevronRight,
  X,
  Layers,
  ArrowRight,
  Smartphone,
  Tablet,
  Monitor,
  Calendar,
  Sparkles,
  HelpCircle,
  Loader2,
  ChevronDown,
  ListTodo,
  Check,
  Edit3,
  Save,
  Tag,
  BarChart3
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import KanbanTaskCard from "@/components/dashboard/KanbanTaskCard";
import DeveloperHeader from "@/components/layout/DeveloperHeader";
import Portal from "@/components/layout/Portal";
import { TaskBoardSkeleton } from "@/components/ui/Skeleton";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignedProjectOption {
  id: string;
  name: string;
  clientName: string;
  targetUrl: string;
}

interface ReplyItem {
  id: string;
  commentId: string;
  authorUserId?: string | null;
  guestAuthorName?: string | null;
  content: string;
  createdAt: string;
  authorUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  } | null;
}

interface TaskItem {
  id: string;
  projectId: string;
  pageId?: string | null;
  title?: string | null;
  content: string;
  notes?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  posX?: number | null;
  posY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  scrollY?: number;
  guestAuthorName?: string | null;
  guestAuthorEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    clientName: string;
    targetUrl: string;
  } | null;
  page?: {
    id: string;
    path: string;
    title: string;
    fullUrl: string;
  } | null;
  authorUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  } | null;
  resolvedByUser?: {
    id: string;
    name: string;
    role: string;
  } | null;
  replies: ReplyItem[];
}

interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  progressPercent: number;
}

function DeveloperTasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "all";

  // Data states
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<AssignedProjectOption[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    progressPercent: 100,
  });
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Synchronize selectedProjectId with URL query param whenever entering or navigating
  useEffect(() => {
    const pId = searchParams.get("projectId");
    if (pId) {
      setSelectedProjectId(pId);
    } else {
      setSelectedProjectId("all");
    }
  }, [searchParams]);

  const handleProjectSelect = (newProjectId: string) => {
    setSelectedProjectId(newProjectId);
    const params = new URLSearchParams(searchParams.toString());
    if (newProjectId === "all") {
      params.delete("projectId");
    } else {
      params.set("projectId", newProjectId);
    }
    const query = params.toString();
    router.replace(`/developer/tasks${query ? `?${query}` : ""}`);
  };

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Detail Drawer state
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Notes editing state in drawer
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSuccessMessage, setNotesSuccessMessage] = useState("");

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (selectedProjectId && selectedProjectId !== "all") {
        params.set("projectId", selectedProjectId);
      }
      if (selectedPriority && selectedPriority !== "all") {
        params.set("priority", selectedPriority);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/developer/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setProjects(data.projects || []);
        setStats(data.stats || { total: 0, pending: 0, inProgress: 0, resolved: 0, progressPercent: 100 });
        setUser(data.user || null);

        // Update activeTask if currently open in drawer
        if (activeTask) {
          const updatedActive = (data.tasks || []).find((t: TaskItem) => t.id === activeTask.id);
          if (updatedActive) {
            setActiveTask(updatedActive);
          }
        }
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load tasks");
      }
    } catch {
      setErrorMessage("Network error connecting to task board");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, selectedPriority, searchQuery, activeTask?.id]);

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId, selectedPriority]);

  // Handle Drag & Drop status transition
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colStatus) {
      setDragOverCol(colStatus);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED") => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const taskToUpdate = tasks.find((t) => t.id === taskId);
    if (!taskToUpdate || taskToUpdate.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    if (activeTask && activeTask.id === taskId) {
      setActiveTask((prev) => prev ? { ...prev, status: targetStatus } : null);
    }

    setDraggedTaskId(null);

    // Call API to persist
    try {
      const res = await fetch(`/api/comments/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        // Revert on failure
        fetchTasks();
      } else {
        const data = await res.json();
        if (data.comment) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...data.comment } : t))
          );
        }
      }
    } catch {
      fetchTasks();
    }
  };

  // Quick single-click status change
  const handleUpdateStatus = async (taskId: string, newStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED") => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    if (activeTask && activeTask.id === taskId) {
      setActiveTask((prev) => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      const res = await fetch(`/api/comments/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...data.comment } : t))
          );
        }
      }
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  // Open task drawer
  const handleOpenTask = (task: TaskItem) => {
    setActiveTask(task);
    setNotesInput(task.notes || "");
    setIsEditingNotes(false);
    setReplyInput("");
    setIsDrawerOpen(true);
  };

  // Save developer notes
  const handleSaveNotes = async () => {
    if (!activeTask) return;
    setIsSavingNotes(true);
    setNotesSuccessMessage("");
    try {
      const res = await fetch(`/api/comments/${activeTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === activeTask.id ? { ...t, notes: notesInput } : t))
        );
        setActiveTask((prev) => prev ? { ...prev, notes: notesInput } : null);
        setIsEditingNotes(false);
        setNotesSuccessMessage("Developer note saved successfully");
        setTimeout(() => setNotesSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Failed to save dev notes:", err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Submit reply / query
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !replyInput.trim()) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/comments/${activeTask.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        const newReply: ReplyItem = data.reply;
        setReplyInput("");
        setActiveTask((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            replies: [...prev.replies, newReply],
          };
        });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeTask.id
              ? { ...t, replies: [...t.replies, newReply] }
              : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to submit reply:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Categorize tasks for Kanban
  const pendingTasks = useMemo(() => tasks.filter((t) => t.status === "PENDING"), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter((t) => t.status === "IN_PROGRESS"), [tasks]);
  const resolvedTasks = useMemo(() => tasks.filter((t) => t.status === "RESOLVED"), [tasks]);

  const priorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Urgent</span>;
      case "HIGH":
        return <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">High</span>;
      case "MEDIUM":
        return <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Medium</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">Low</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Unified Rock-Solid Centralized Developer Header */}
      <DeveloperHeader
        user={user}
        projects={projects.map((p) => ({ id: p.id, name: p.name, clientName: p.clientName, targetUrl: p.targetUrl }))}
        tasks={tasks.map((t) => ({ id: t.id, projectId: t.projectId, projectName: t.project?.name, title: t.title, content: t.content, priority: t.priority, status: t.status, pagePath: t.page?.path }))}
      />

      {/* Main Workspace (Standardized max-w-7xl) */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col">
        {/* Banner: Title + Stats Summary */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
              <ListTodo className="h-4 w-4" />
              <span>Developer Task Execution Hub</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Visual Pinpoint Task Board
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Drag and drop visual annotation tasks, write technical notes, ask queries directly on feedback pins, and inspect coordinates.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 bg-card border border-border/80 p-3 rounded-2xl shadow-xs self-start md:self-auto">
            <div className="px-3 border-r border-border/60 text-center">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Total</div>
              <div className="text-lg font-bold text-foreground font-mono">{stats.total}</div>
            </div>
            <div className="px-3 border-r border-border/60 text-center">
              <div className="text-[10px] uppercase font-bold text-amber-700">To Do</div>
              <div className="text-lg font-bold text-amber-900 font-mono">{stats.pending}</div>
            </div>
            <div className="px-3 border-r border-border/60 text-center">
              <div className="text-[10px] uppercase font-bold text-sky-700">In Progress</div>
              <div className="text-lg font-bold text-sky-900 font-mono">{stats.inProgress}</div>
            </div>
            <div className="px-3 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Resolved</div>
              <div className="text-lg font-bold text-emerald-900 font-mono">{stats.resolved}</div>
            </div>
          </div>
        </div>

        {/* Filter & Control Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Project Selector Dropdown */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectSelect(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs pr-8"
              >
                <option value="all">📁 All Assigned Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" />
            </div>

            {/* Priority Selector */}
            <div className="relative min-w-[130px]">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full appearance-none rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs pr-8"
              >
                <option value="all">Priority: All</option>
                <option value="URGENT">🔥 Urgent</option>
                <option value="HIGH">⚡ High</option>
                <option value="MEDIUM">🔹 Medium</option>
                <option value="LOW">◽ Low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 pointer-events-none text-muted-foreground" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks, notes, pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchTasks();
                }}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTasks}
              className="inline-flex items-center gap-1.5 h-9 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3 text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
              title="Refresh Task Board"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-border bg-secondary/60 p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === "kanban" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === "list" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Loading state */}
        {isLoading && tasks.length === 0 ? (
          <div className="flex-1 py-4">
            <TaskBoardSkeleton />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 rounded-2xl border border-dashed border-border/80 bg-card p-16 text-center shadow-xs flex flex-col items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">No Tasks Found</h3>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
              {searchQuery || selectedPriority !== "all"
                ? "No tasks match your active filters. Try resetting the search or priority filter."
                : "All visual comments and tasks for your assigned projects have been resolved! Great work."}
            </p>
          </div>
        ) : viewMode === "kanban" ? (
          /* Kanban Board Columns */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 items-start">
            {/* Column 1: PENDING / To Do */}
            <div
              onDragOver={(e) => handleDragOver(e, "PENDING")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "PENDING")}
              className={`flex flex-col rounded-2xl border p-4 bg-slate-50/50 min-h-[600px] transition-all duration-200 ${
                dragOverCol === "PENDING"
                  ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-300"
                  : "border-border/80"
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <h3 className="font-display text-sm font-bold text-foreground">To Do / Pending</h3>
                </div>
                <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 text-xs font-bold font-mono">
                  {pendingTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {pendingTasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task as any}
                    onOpen={() => handleOpenTask(task)}
                    onDragStart={handleDragStart}
                    onStatusChange={handleUpdateStatus}
                    showProjectBadge={selectedProjectId === "all"}
                  />
                ))}
                {pendingTasks.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                    No pending tasks
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: IN_PROGRESS / Active */}
            <div
              onDragOver={(e) => handleDragOver(e, "IN_PROGRESS")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "IN_PROGRESS")}
              className={`flex flex-col rounded-2xl border p-4 bg-slate-50/50 min-h-[600px] transition-all duration-200 ${
                dragOverCol === "IN_PROGRESS"
                  ? "border-sky-400 bg-sky-50/40 ring-2 ring-sky-300"
                  : "border-border/80"
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
                  <h3 className="font-display text-sm font-bold text-foreground">In Progress</h3>
                </div>
                <span className="rounded-full bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-0.5 text-xs font-bold font-mono">
                  {inProgressTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {inProgressTasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task as any}
                    onOpen={() => handleOpenTask(task)}
                    onDragStart={handleDragStart}
                    onStatusChange={handleUpdateStatus}
                    showProjectBadge={selectedProjectId === "all"}
                  />
                ))}
                {inProgressTasks.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                    Drag cards here when actively working
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: RESOLVED / Completed */}
            <div
              onDragOver={(e) => handleDragOver(e, "RESOLVED")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "RESOLVED")}
              className={`flex flex-col rounded-2xl border p-4 bg-slate-50/50 min-h-[600px] transition-all duration-200 ${
                dragOverCol === "RESOLVED"
                  ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-300"
                  : "border-border/80"
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <h3 className="font-display text-sm font-bold text-foreground">Resolved / Done</h3>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold font-mono">
                  {resolvedTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {resolvedTasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task as any}
                    onOpen={() => handleOpenTask(task)}
                    onDragStart={handleDragStart}
                    onStatusChange={handleUpdateStatus}
                    showProjectBadge={selectedProjectId === "all"}
                  />
                ))}
                {resolvedTasks.length === 0 && (
                  <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                    No resolved tasks yet
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Detailed List View */
          <div className="bg-card rounded-2xl border border-border/80 overflow-hidden shadow-xs">
            <div className="divide-y divide-border/60">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleOpenTask(task)}
                  className="p-4 hover:bg-secondary/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {priorityBadge(task.priority)}
                      <span className="text-[11px] font-semibold text-primary">
                        {task.project?.name || "Project"}
                      </span>
                      <span className="text-muted-foreground/40 text-xs">&bull;</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {task.page?.path || "/"}
                      </span>
                      {task.viewportWidth && task.viewportHeight && (
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
                          {task.viewportWidth} × {task.viewportHeight}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {task.content}
                    </p>
                    {task.notes && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 mt-2 inline-block">
                        <strong>Dev Note:</strong> {task.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                    {/* Status Pill */}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        task.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : task.status === "IN_PROGRESS"
                          ? "bg-sky-100 text-sky-800 border border-sky-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {task.status.replace("_", " ")}
                    </span>

                    {/* Replies count */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{task.replies.length}</span>
                    </div>

                    <Link
                      href={`/preview/${task.projectId}?commentId=${task.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Inspect Pin in Visual Preview"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      <span className="hidden sm:inline">Inspect</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Task Detail & Discussion Slide-Over Drawer */}
      {isDrawerOpen && activeTask && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in">
            {/* Backdrop Click */}
            <div className="fixed inset-0" onClick={() => setIsDrawerOpen(false)} />

            <div className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-card/95">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Details</span>
                <span className="text-muted-foreground/40">&bull;</span>
                {priorityBadge(activeTask.priority)}
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Project & Page Metadata Box */}
              <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {activeTask.project?.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Client: {activeTask.project?.clientName}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-0.5 font-mono">
                    📄 {activeTask.page?.path || "/"}
                  </span>
                  {activeTask.viewportWidth && activeTask.viewportHeight && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-0.5 font-mono">
                      🖥️ {activeTask.viewportWidth} × {activeTask.viewportHeight}
                    </span>
                  )}
                  {activeTask.posX !== null && activeTask.posY !== null && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-0.5 font-mono text-[11px]">
                      📍 Pin ({Math.round(activeTask.posX || 0)}%, {Math.round(activeTask.posY || 0)}%)
                    </span>
                  )}
                </div>

                {/* Inspect Link */}
                <div className="pt-2">
                  <Link
                    href={`/preview/${activeTask.projectId}?commentId=${activeTask.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Open Pinpoint in Visual Preview Window &rarr;</span>
                  </Link>
                </div>
              </div>

              {/* Status Switcher */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Task Progression Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeTask.id, "PENDING")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      activeTask.status === "PENDING"
                        ? "bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    To Do
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeTask.id, "IN_PROGRESS")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      activeTask.status === "IN_PROGRESS"
                        ? "bg-sky-100 text-sky-900 border-sky-400 ring-2 ring-sky-300"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeTask.id, "RESOLVED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      activeTask.status === "RESOLVED"
                        ? "bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-300"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    Resolved
                  </button>
                </div>
              </div>

              {/* Task Pin Comment Content */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Visual Feedback / Client Request
                </label>
                <div className="rounded-2xl border border-border/80 bg-card p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {activeTask.content}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Author: {activeTask.authorUser?.name || activeTask.guestAuthorName || "Reviewer"}</span>
                  <span>{new Date(activeTask.createdAt).toLocaleDateString()} at {new Date(activeTask.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Developer Optional Notes Section */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <StickyNote className="h-4 w-4 text-emerald-600" />
                    <span>Developer Technical Notes</span>
                  </div>
                  {!isEditingNotes && (
                    <button
                      type="button"
                      onClick={() => setIsEditingNotes(true)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{activeTask.notes ? "Edit Note" : "+ Add Note"}</span>
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Add technical notes, reproduction steps, PR links, or solution details..."
                      className="w-full rounded-xl border border-emerald-300 bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotesInput(activeTask.notes || "");
                          setIsEditingNotes(false);
                        }}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingNotes}
                        onClick={handleSaveNotes}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        <span>Save Note</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {activeTask.notes ? (
                      <p className="text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed">
                        {activeTask.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-800/60 italic">
                        No technical notes written yet. Click &quot;+ Add Note&quot; to keep developer logs or solution links.
                      </p>
                    )}
                  </div>
                )}

                {notesSuccessMessage && (
                  <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                    {notesSuccessMessage}
                  </div>
                )}
              </div>

              {/* Threaded Discussion & Query Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>Threaded Discussion & Queries ({activeTask.replies.length})</span>
                  </div>
                </div>

                {/* Conversation List */}
                <div className="space-y-3 mb-4">
                  {activeTask.replies.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                      No replies or queries posted yet. Use the box below to ask questions or give status updates!
                    </div>
                  ) : (
                    activeTask.replies.map((reply) => {
                      const isDev = reply.authorUser?.role === "DEVELOPER";
                      const isAdmin = reply.authorUser?.role === "ADMIN";
                      return (
                        <div
                          key={reply.id}
                          className={`rounded-xl border p-3.5 ${
                            isDev
                              ? "bg-primary/5 border-primary/20"
                              : isAdmin
                              ? "bg-indigo-50/60 border-indigo-200"
                              : "bg-secondary/40 border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">
                                {reply.authorUser?.name || reply.guestAuthorName || "Reviewer"}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                  isDev
                                    ? "bg-primary/10 text-primary"
                                    : isAdmin
                                    ? "bg-indigo-100 text-indigo-800"
                                    : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {isDev ? "Developer" : isAdmin ? "Admin" : "Client / Guest"}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(reply.createdAt).toLocaleDateString()} {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Ask a query, request clarification from client, or reply with update..."
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingReply || !replyInput.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    >
                      {isSubmittingReply ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Post Query / Reply</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </Portal>
      )}
    </div>
  );
}



export default function DeveloperTasksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-xs font-medium">Loading developer task board...</p>
        </div>
      }
    >
      <DeveloperTasksContent />
    </Suspense>
  );
}
