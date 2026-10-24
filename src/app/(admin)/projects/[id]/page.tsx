"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FolderKanban,
  Kanban,
  Settings,
  TrendingUp,
  Globe,
  ExternalLink,
  Eye,
  Share2,
  Users,
  FileText,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Trash2,
  Sliders,
  Sparkles,
  Loader2,
  UserX,
  X,
  Lock,
  EyeOff,
  Send,
  MessageSquare,
  Check,
  Copy,
  Filter,
  ListTodo,
  Edit3,
  Save,
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  StickyNote,
  CheckSquare,
  Square,
  Layers,
  Activity,
  Power,
  Ban,
  BarChart3,
  Award,
  Radio,
  Info,
  Laptop,
  Building2,
  Image as ImageIcon
} from "lucide-react";
import { LaunchWpButton } from "@/components/dashboard/LaunchWpButton";
import ShareModal from "@/components/dashboard/ShareModal";
import TaskProgressMeter from "@/components/dashboard/TaskProgressMeter";
import { CredentialVaultModal } from "@/components/admin/CredentialVaultModal";
import UserAvatar from "@/components/ui/UserAvatar";
import KanbanTaskCard from "@/components/dashboard/KanbanTaskCard";
import CreateTaskModal from "@/components/admin/CreateTaskModal";
import Portal from "@/components/layout/Portal";
import ImageDropzone from "@/components/ui/ImageDropzone";
import { ProjectDetailSkeleton } from "@/components/ui/Skeleton";

const CATEGORIES = [
  { id: "WORDPRESS", label: "WordPress", desc: "Zero-Trust Companion Login" },
  { id: "WOOCOMMERCE", label: "WooCommerce", desc: "E-Commerce & Shop Manager" },
  { id: "SHOPIFY", label: "Shopify", desc: "Liquid & Storefront Theme" },
  { id: "WEBFLOW", label: "Webflow", desc: "Designer & CMS Staging" },
  { id: "NEXTJS", label: "Next.js", desc: "App Router / Full-Stack" },
  { id: "REACT", label: "React", desc: "Single Page Web App" },
  { id: "REACT_NATIVE", label: "React Native", desc: "Cross-Platform Mobile App" },
  { id: "CUSTOM", label: "Custom Architecture", desc: "Tailored Engineering" },
];

const STAGES = [
  { id: "FULL_DEVELOPMENT", label: "Full Development", desc: "Building brand new architecture from scratch" },
  { id: "WORKING_ON_DEVELOPED", label: "Working on Developed", desc: "Iterating on an existing live site or codebase" },
  { id: "MAINTENANCE", label: "Maintenance & Support", desc: "Ongoing retainer and feature enhancements" },
  { id: "AUDIT_REVIEW", label: "Review & QA Audit", desc: "Inspection, responsive testing & client sign-off" },
];

interface SessionItem {
  id: string;
  assignmentId: string;
  developer: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role?: string;
  };
  isCurrentUser?: boolean;
  isAdmin?: boolean;
  wpRoleTemplate: string;
  status: "ACTIVE" | "PENDING_DISPATCH" | "CONSUMED" | "EXPIRED" | "REVOKED";
  device: string;
  browser: string;
  os: string;
  isCompanionExtension: boolean;
  ipAddress: string;
  createdAt: string;
  usedAt?: string | null;
  expiresAt: string;
  assignmentExpiresAt: string;
}

interface ClientOption {
  id: string;
  name: string;
  email: string;
  company?: string | null;
}

// --- TYPES ---
interface Developer {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface PageItem {
  id: string;
  path: string;
  fullUrl: string;
  title: string;
  isDefault: boolean;
  isHidden: boolean;
  displayOrder: number;
  commentCount: number;
}

interface CommentReply {
  id: string;
  content: string;
  createdAt: string;
  authorUser?: {
    id: string;
    name: string;
    role?: string;
    avatarUrl?: string | null;
  } | null;
  guestAuthorName?: string | null;
}

interface CommentTaskItem {
  id: string;
  projectId?: string;
  title?: string | null;
  content: string;
  notes?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  pageId?: string;
  page?: { id: string; path: string; title: string; fullUrl?: string } | null;
  authorUser?: { id: string; name: string; role?: string; avatarUrl?: string | null } | null;
  assigneeUserId?: string | null;
  assigneeUser?: { id: string; name: string; role?: string; avatarUrl?: string | null } | null;
  resolvedByUser?: { id: string; name: string; role?: string } | null;
  guestAuthorName?: string | null;
  guestAuthorEmail?: string | null;
  posX?: number | null;
  posY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  createdAt: string;
  updatedAt?: string;
  replies?: CommentReply[];
}

interface AssignmentItem {
  id: string;
  projectId: string;
  userId: string;
  user: Developer;
  wpRoleTemplate: "RESTRICTED_ADMIN" | "EDITOR" | "SHOP_MANAGER";
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  isActive: boolean;
  isExpired: boolean;
  isRevoked: boolean;
}

interface ProjectData {
  id: string;
  name: string;
  clientName: string;
  clientId?: string;
  client?: {
    id: string;
    name: string;
    email?: string;
    company?: string | null;
  } | null;
  targetUrl: string;
  status: string;
  stage?: string;
  category?: string;
  imageUrl?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  defaultViewport?: string;
  autoUnframeProxy?: boolean;
  allowGuestComments?: boolean;
  requireGuestEmail?: boolean;
  allowExtensionLogin?: boolean;
  allowProxyLogin?: boolean;
  isWpConfigured?: boolean;
  wpLoginUrl?: string;
  pages?: PageItem[];
}

function formatAccessExpiry(dateStr: string): { formatted: string; relative: string; isExpired: boolean } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { formatted: "Never", relative: "No expiration set", isExpired: false };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

    const diffMs = d.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffMs <= 0) {
      return { formatted, relative: "Expired", isExpired: true };
    }
    if (diffDays <= 1) {
      return { formatted, relative: `${Math.max(1, diffHours)}h remaining`, isExpired: false };
    }
    return { formatted, relative: `${diffDays} days remaining`, isExpired: false };
  } catch {
    return { formatted: dateStr, relative: "", isExpired: false };
  }
}

function ProjectDetailContent() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Robustly extract projectId from params or pathname (works with both direct & rewritten routes)
  const routeId = params?.id as string | undefined;
  const pathId = pathname ? pathname.match(/projects\/([^\/?#]+)/)?.[1] : undefined;
  const projectId = (routeId && routeId !== "[id]") ? routeId : (pathId || "");

  // Active top tab: "progress" | "dev-progress" | "tasks" | "settings"
  const activeTab = searchParams.get("tab") || "progress";
  // Active settings subtab: "details" | "sessions" | "team" | "pages" | "vault" | "channel" | "danger"
  const activeSubTab = searchParams.get("sub") || "details";

  // State
  const [project, setProject] = useState<ProjectData | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [comments, setComments] = useState<CommentTaskItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [availableDevelopers, setAvailableDevelopers] = useState<Developer[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Editable Project Details State
  const [editName, setEditName] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editCategory, setEditCategory] = useState("WORDPRESS");
  const [editStage, setEditStage] = useState("FULL_DEVELOPMENT");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editTargetUrl, setEditTargetUrl] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editDefaultViewport, setEditDefaultViewport] = useState("desktop");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Sessions Sentinel State
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [sessionFilter, setSessionFilter] = useState<"ALL" | "DEVELOPERS" | "ADMIN">("ALL");
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isPurgingSessions, setIsPurgingSessions] = useState(false);
  const [isRevokingSessionId, setIsRevokingSessionId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    if (sessionFilter === "DEVELOPERS") {
      return sessions.filter((s) => !s.isAdmin && s.developer.role !== "ADMIN");
    }
    if (sessionFilter === "ADMIN") {
      return sessions.filter((s) => s.isAdmin || s.developer.role === "ADMIN");
    }
    return sessions;
  }, [sessions, sessionFilter]);

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);

  // Settings subtab: new page state
  const [newTitle, setNewTitle] = useState("");
  const [newPath, setNewPath] = useState("");
  const [isAddingPage, setIsAddingPage] = useState(false);

  // Settings subtab: website page discovery & sync state
  const [discoveredWebsitePages, setDiscoveredWebsitePages] = useState<
    Array<{
      path: string;
      title: string;
      fullUrl: string;
      category: "CORE" | "SHOP" | "BLOG" | "LEGAL" | "OTHER";
      isDefault: boolean;
      selected: boolean;
    }>
  >([]);
  const [pageCategoryFilter, setPageCategoryFilter] = useState<string>("ALL");
  const [pageSearchQuery, setPageSearchQuery] = useState<string>("");
  const [isScanningWebsite, setIsScanningWebsite] = useState(false);
  const [hasScannedWebsite, setHasScannedWebsite] = useState(false);
  const [scanWebsiteMsg, setScanWebsiteMsg] = useState("");
  const [isAddingBatchPages, setIsAddingBatchPages] = useState(false);
  const [isDeletingPageId, setIsDeletingPageId] = useState<string | null>(null);

  // Settings subtab: assign developer modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [roleTemplate, setRoleTemplate] = useState<"RESTRICTED_ADMIN" | "EDITOR" | "SHOP_MANAGER">("RESTRICTED_ADMIN");
  const [durationPreset, setDurationPreset] = useState<"24h" | "3d" | "7d" | "14d" | "30d" | "custom">("7d");
  const [customDateTime, setCustomDateTime] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Settings subtab: General/Vault form state
  const [targetUrl, setTargetUrl] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [allowExtensionLogin, setAllowExtensionLogin] = useState(true);
  const [allowProxyLogin, setAllowProxyLogin] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Task Board full-view states & drawer
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPageFilter, setTaskPageFilter] = useState("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("");
  const [taskViewMode, setTaskViewMode] = useState<"kanban" | "list">("kanban");
  const [activeDrawerTask, setActiveDrawerTask] = useState<CommentTaskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<"PENDING" | "IN_PROGRESS" | "RESOLVED" | null>(null);

  // Drawer task discussion & notes states
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState("");

  // Fetch all project data
  const fetchAllProjectData = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      setErrorMessage("No project ID detected in request");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [projRes, commentsRes, assignmentsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/comments?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}/assignments`),
      ]);

      if (projRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (projRes.ok) {
        const pData = await projRes.json();
        const p = pData.project;
        setProject(p);
        setPages(p.pages || []);
        setTargetUrl(p.targetUrl || "");
        setStatus(p.status || "ACTIVE");
        setAllowExtensionLogin(p.allowExtensionLogin ?? true);
        setAllowProxyLogin(p.allowProxyLogin ?? false);

        // Pre-fill editable details
        setEditName(p.name || "");
        setEditClientId(p.clientId || "");
        setEditCategory(p.category || "WORDPRESS");
        setEditStage(p.stage || "FULL_DEVELOPMENT");
        setEditStatus(p.status || "ACTIVE");
        setEditTargetUrl(p.targetUrl || "");
        setEditStartDate(p.startDate ? p.startDate.split("T")[0] : "");
        setEditTargetDate(p.targetDate ? p.targetDate.split("T")[0] : "");
        setEditDefaultViewport(p.defaultViewport || "desktop");
        setEditImageUrl(p.imageUrl || "");
      } else {
        const err = await projRes.json().catch(() => ({}));
        setErrorMessage(err.error || `Failed to load project details (HTTP ${projRes.status})`);
      }

      if (commentsRes.ok) {
        const cData = await commentsRes.json();
        setComments(cData.comments || []);
      }

      if (assignmentsRes.ok) {
        const aData = await assignmentsRes.json();
        setAssignments(aData.assignments || []);
        setAvailableDevelopers(aData.availableDevelopers || []);
      }
    } catch {
      setErrorMessage("Network error connecting to project workspace");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch Login Sessions
  const fetchSessions = useCallback(async () => {
    if (!projectId) return;
    setIsLoadingSessions(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setSessionStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchAllProjectData();
      fetchSessions();
      fetch("/api/clients")
        .then((r) => r.json())
        .then((d) => {
          if (d.clients) setClients(d.clients);
        })
        .catch(() => {});
    } else {
      setIsLoading(false);
    }
  }, [projectId, fetchAllProjectData, fetchSessions]);

  // Session Sentinel Handlers
  const handleRevokeSession = async (grantId: string, isSelf = false) => {
    setIsRevokingSessionId(grantId);
    try {
      const res = await fetch(`/api/projects/${projectId}/sessions?grantId=${grantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setSuccessMessage(
          isSelf
            ? "Your WordPress login session was terminated and revoked successfully."
            : "Developer WordPress session terminated and revoked successfully. Team project assignment remains active."
        );
        if (data.domain) {
          window.postMessage({ type: "VANGUARD_REVOKE_WP_SESSION", domain: data.domain }, "*");
          window.postMessage({ type: "RENO_REVOKE_WP_SESSION", domain: data.domain }, "*");
        }
        fetchSessions();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || "Failed to revoke session");
      }
    } catch {
      setErrorMessage("Network error revoking session");
    } finally {
      setIsRevokingSessionId(null);
    }
  };

  const handlePurgeAllSessions = async () => {
    if (
      !confirm(
        "Are you sure you want to purge all active developer login sessions for this project? Any active developer WordPress sessions will be terminated immediately."
      )
    ) {
      return;
    }
    setIsPurgingSessions(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sessions?purge=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setSuccessMessage(data.message || "All active sessions purged successfully.");
        if (data.domain) {
          window.postMessage({ type: "VANGUARD_REVOKE_WP_SESSION", domain: data.domain }, "*");
          window.postMessage({ type: "RENO_REVOKE_WP_SESSION", domain: data.domain }, "*");
        }
        fetchSessions();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || "Failed to purge sessions");
      }
    } catch {
      setErrorMessage("Network error purging sessions");
    } finally {
      setIsPurgingSessions(false);
    }
  };

  const handleSaveProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          clientId: editClientId || null,
          targetUrl: editTargetUrl,
          category: editCategory,
          stage: editStage,
          status: editStatus,
          startDate: editStartDate || null,
          targetDate: editTargetDate || null,
          defaultViewport: editDefaultViewport,
          imageUrl: editImageUrl || null,
        }),
      });

      if (res.ok) {
        setSuccessMessage("Project details, stage, tech stack, and banner saved successfully!");
        fetchAllProjectData();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || "Failed to save project details");
      }
    } catch {
      setErrorMessage("Network error saving project details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Tab switcher
  const handleTabChange = (tab: "progress" | "dev-progress" | "tasks" | "settings") => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    if (tab === "settings" && !url.searchParams.has("sub")) {
      url.searchParams.set("sub", "details");
    }
    router.push(url.pathname + url.search);
  };

  // Subtab switcher
  const handleSubTabChange = (sub: "details" | "sessions" | "team" | "pages" | "vault" | "channel" | "danger") => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "settings");
    url.searchParams.set("sub", sub);
    router.push(url.pathname + url.search);
  };

  // Status stats
  const resolvedCount = comments.filter((c) => c.status === "RESOLVED").length;
  const inProgressCount = comments.filter((c) => c.status === "IN_PROGRESS").length;
  const pendingCount = comments.filter((c) => c.status === "PENDING").length;

  // --- ACTIONS: Pages ---
  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath || !newTitle) return;
    setIsAddingPage(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath, title: newTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setPages((prev) => [...prev, data.page]);
        setNewTitle("");
        setNewPath("");
        setSuccessMessage(`Page "${data.page.title}" added to directory!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch {
      setErrorMessage("Failed to add page");
    } finally {
      setIsAddingPage(false);
    }
  };

  const handleToggleHidePage = async (page: PageItem) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !page.isHidden }),
      });
      if (res.ok) {
        setPages((prev) =>
          prev.map((p) => (p.id === page.id ? { ...p, isHidden: !p.isHidden } : p))
        );
      }
    } catch {}
  };

  const handleScanWebsitePages = async () => {
    if (!project?.targetUrl) return;
    setIsScanningWebsite(true);
    setScanWebsiteMsg("");

    try {
      const res = await fetch(`/api/projects/discover-pages?url=${encodeURIComponent(project.targetUrl)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.pages)) {
        const existingPathSet = new Set(pages.map((p) => p.path));

        const mapped = data.pages.map((p: any) => {
          const alreadyInProject = existingPathSet.has(p.path);
          // Pre-select non-added CORE, SHOP, and LEGAL pages by default so blog posts don't overwhelm
          const isPriorityPage =
            p.category === "CORE" ||
            p.category === "SHOP" ||
            p.category === "LEGAL" ||
            p.isDefault;

          return {
            path: p.path,
            title: p.title || p.path,
            fullUrl: p.fullUrl || `${project.targetUrl.replace(/\/+$/, "")}${p.path}`,
            category: p.category || "OTHER",
            isDefault: p.isDefault || p.path === "/",
            selected: !alreadyInProject && isPriorityPage,
          };
        });

        setDiscoveredWebsitePages(mapped);
        setHasScannedWebsite(true);
        const newCount = mapped.filter((p: any) => !existingPathSet.has(p.path)).length;
        const newPriorityCount = mapped.filter(
          (p: any) =>
            !existingPathSet.has(p.path) &&
            (p.category === "CORE" || p.category === "SHOP" || p.category === "LEGAL" || p.isDefault)
        ).length;

        setScanWebsiteMsg(
          newCount > 0
            ? `Discovered ${mapped.length} total pages (${newCount} new to add, ${newPriorityCount} core/nav pages pre-selected).`
            : `All ${mapped.length} discovered website pages are already added in this project.`
        );
      } else {
        setScanWebsiteMsg(data.error || "Failed to scan website pages");
      }
    } catch {
      setScanWebsiteMsg("Network timeout while scanning website pages");
    } finally {
      setIsScanningWebsite(false);
    }
  };

  const handleToggleSelectDiscoveredPage = (path: string) => {
    setDiscoveredWebsitePages((prev) =>
      prev.map((p) => (p.path === path ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleSelectAllDiscovered = (select: boolean) => {
    const existingPathSet = new Set(pages.map((p) => p.path));
    setDiscoveredWebsitePages((prev) =>
      prev.map((p) => {
        if (existingPathSet.has(p.path)) return p;
        if (pageCategoryFilter !== "ALL" && p.category !== pageCategoryFilter) {
          return p;
        }
        return { ...p, selected: select };
      })
    );
  };

  const handleSelectCoreOnlyDiscovered = () => {
    const existingPathSet = new Set(pages.map((p) => p.path));
    setDiscoveredWebsitePages((prev) =>
      prev.map((p) => {
        if (existingPathSet.has(p.path)) return p;
        const isCore =
          p.category === "CORE" ||
          p.category === "SHOP" ||
          p.category === "LEGAL" ||
          p.isDefault;
        return { ...p, selected: isCore };
      })
    );
  };

  const handleAddBatchPages = async () => {
    const existingPathSet = new Set(pages.map((p) => p.path));
    const toAdd = discoveredWebsitePages
      .filter((p) => p.selected && !existingPathSet.has(p.path))
      .map((p) => ({ path: p.path, title: p.title }));

    if (toAdd.length === 0) return;
    setIsAddingBatchPages(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: toAdd }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.pages) {
          setPages(data.pages);
        } else {
          fetchAllProjectData();
        }
        setSuccessMessage(`Successfully added ${toAdd.length} new pages to project directory!`);
        setDiscoveredWebsitePages((prev) =>
          prev.map((p) => (toAdd.some((a) => a.path === p.path) ? { ...p, selected: false } : p))
        );
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch {
      setErrorMessage("Failed to add selected pages");
    } finally {
      setIsAddingBatchPages(false);
    }
  };

  const handleDeletePage = async (pageId: string, pagePath: string) => {
    if (pagePath === "/") {
      setErrorMessage("Cannot delete the root home page.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    if (!confirm(`Are you sure you want to remove "${pagePath}" from this project preview?`)) return;

    setIsDeletingPageId(pageId);
    try {
      const res = await fetch(`/api/projects/${projectId}/pages/${pageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== pageId));
        setSuccessMessage("Page removed from preview directory.");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch {
      setErrorMessage("Failed to delete page");
    } finally {
      setIsDeletingPageId(null);
    }
  };

  // --- ACTIONS: Assignments ---
  const handleAssignDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsAssigning(true);

    const now = new Date();
    let expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (durationPreset === "24h") expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    else if (durationPreset === "3d") expiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    else if (durationPreset === "14d") expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    else if (durationPreset === "30d") expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    else if (durationPreset === "custom" && customDateTime) expiry = new Date(customDateTime);

    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          wpRoleTemplate: roleTemplate,
          expiresAt: expiry.toISOString(),
        }),
      });
      if (res.ok) {
        setSuccessMessage("Developer assigned with zero-trust access grant!");
        setIsAssignModalOpen(false);
        fetchAllProjectData();
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch {
      setErrorMessage("Failed to assign developer");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleExtendSevenDays = async (assignmentId: string, currentExpiry: string) => {
    const baseDate = new Date(currentExpiry) > new Date() ? new Date(currentExpiry) : new Date();
    const extendedDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    try {
      const res = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          expiresAt: extendedDate.toISOString(),
        }),
      });
      if (res.ok) {
        setSuccessMessage("Access extended by 7 days!");
        fetchAllProjectData();
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch {}
  };

  const handleRevokeAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/broker/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (res.ok) {
        setSuccessMessage("Access grant revoked.");
        fetchAllProjectData();
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch {}
  };

  // --- ACTIONS: Save Settings ---
  const handleSaveChannelSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          status,
          allowExtensionLogin,
          allowProxyLogin,
        }),
      });
      if (res.ok) {
        setSuccessMessage("Project settings updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3500);
      }
    } catch {
      setErrorMessage("Failed to update project settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // --- ACTIONS: Task Status Update ---
  const handleUpdateTaskStatus = async (
    commentId: string,
    newStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED"
  ) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, status: newStatus } : c))
        );
        if (activeDrawerTask && activeDrawerTask.id === commentId) {
          setActiveDrawerTask((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch {}
  };

  // Drag and Drop Handlers for Kanban Board
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, col: "PENDING" | "IN_PROGRESS" | "RESOLVED") => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, col: "PENDING" | "IN_PROGRESS" | "RESOLVED") => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    await handleUpdateTaskStatus(taskId, col);
  };

  const handleOpenDrawer = (task: CommentTaskItem) => {
    setActiveDrawerTask(task);
    setNotesText(task.notes || "");
    setIsEditingNotes(false);
    setNotesSuccess("");
    setReplyText("");
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setActiveDrawerTask(null);
  };

  const handleSaveNotes = async () => {
    if (!activeDrawerTask) return;
    setIsSavingNotes(true);
    setNotesSuccess("");
    try {
      const res = await fetch(`/api/comments/${activeDrawerTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesText }),
      });
      if (res.ok) {
        setNotesSuccess("Note saved successfully!");
        setComments((prev) =>
          prev.map((c) => (c.id === activeDrawerTask.id ? { ...c, notes: notesText } : c))
        );
        setActiveDrawerTask((prev) => (prev ? { ...prev, notes: notesText } : null));
        setIsEditingNotes(false);
        setTimeout(() => setNotesSuccess(""), 3000);
      }
    } catch {}
    setIsSavingNotes(false);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDrawerTask || !replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/comments/${activeDrawerTask.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const newReply = data.reply || {
          id: `r_${Date.now()}`,
          content: replyText.trim(),
          createdAt: new Date().toISOString(),
          authorUser: { id: "me", name: "Agency Owner", role: "ADMIN" },
        };
        const updatedReplies = [...(activeDrawerTask.replies || []), newReply];
        setActiveDrawerTask((prev) => (prev ? { ...prev, replies: updatedReplies } : null));
        setComments((prev) =>
          prev.map((c) => (c.id === activeDrawerTask.id ? { ...c, replies: updatedReplies } : c))
        );
        setReplyText("");
      }
    } catch {}
    setIsSubmittingReply(false);
  };

  const handleTaskCreated = (newTask: any) => {
    const formattedTask: CommentTaskItem = {
      id: newTask.id,
      projectId,
      title: newTask.title,
      content: newTask.content,
      notes: newTask.notes,
      status: newTask.status || "PENDING",
      priority: newTask.priority || "MEDIUM",
      pageId: newTask.pageId,
      page: newTask.page || pages.find((p) => p.id === newTask.pageId) || null,
      authorUser: newTask.authorUser || { id: "admin", name: "Agency Owner", role: "ADMIN" },
      assigneeUser: newTask.assigneeUser || null,
      createdAt: newTask.createdAt || new Date().toISOString(),
      replies: [],
    };
    setComments((prev) => [formattedTask, ...prev]);
    setSuccessMessage("Task created and added to the Kanban board!");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  // Filtered comments for the Kanban board
  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      const q = taskSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.content.toLowerCase().includes(q) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.authorUser?.name && c.authorUser.name.toLowerCase().includes(q)) ||
        (c.guestAuthorName && c.guestAuthorName.toLowerCase().includes(q)) ||
        (c.page?.path && c.page.path.toLowerCase().includes(q));

      const matchesPage = !taskPageFilter || c.pageId === taskPageFilter;
      const matchesPriority = !taskPriorityFilter || (c.priority || "MEDIUM") === taskPriorityFilter;

      return matchesSearch && matchesPage && matchesPriority;
    });
  }, [comments, taskSearch, taskPageFilter, taskPriorityFilter]);

  const pendingFilteredTasks = useMemo(() => filteredComments.filter((c) => c.status === "PENDING"), [filteredComments]);
  const inProgressFilteredTasks = useMemo(() => filteredComments.filter((c) => c.status === "IN_PROGRESS"), [filteredComments]);
  const resolvedFilteredTasks = useMemo(() => filteredComments.filter((c) => c.status === "RESOLVED"), [filteredComments]);

  if (isLoading && !project) {
    return <ProjectDetailSkeleton />;
  }

  if (!project && !isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="rounded-3xl border border-destructive/20 bg-card p-8 sm:p-12 max-w-lg mx-auto shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">Project Workspace Not Found</h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            {errorMessage || "The requested client project could not be found or you may not have active permissions."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/admin/projects"
              className="rounded-xl border border-border/80 bg-card hover:bg-secondary px-4 py-2 text-xs font-semibold text-foreground transition-all shadow-xs"
            >
              Back to Projects
            </Link>
            <button
              onClick={fetchAllProjectData}
              className="rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white transition-all shadow-xs cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Alerts */}
      {errorMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Top Project Context Deck */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              {project?.clientName || "Client Project"}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                project?.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              {project?.status || "ACTIVE"}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {project?.name}
          </h1>

          <a
            href={project?.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
          >
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate max-w-[280px] font-medium">{project?.targetUrl}</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>

        {/* Global Project Header Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Zero-Trust 1-Click Login Button */}
          <LaunchWpButton
            projectId={projectId}
            projectName={project?.name || "Client Website"}
            targetUrl={project?.targetUrl || ""}
            allowExtensionLogin={project?.allowExtensionLogin ?? true}
            allowProxyLogin={project?.allowProxyLogin ?? false}
            isConfigured={project?.isWpConfigured}
          />

          {/* Launch Interactive Preview */}
          <Link
            href={`/preview/${projectId}`}
            className="inline-flex items-center gap-1.5 h-9 sm:h-10 rounded-xl bg-primary hover:bg-primary/90 px-3.5 sm:px-4 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Visual Preview</span>
          </Link>

          {/* Share Modal */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 sm:h-10 rounded-xl border border-border/80 bg-card hover:bg-secondary px-3.5 text-xs font-semibold text-foreground transition-all shadow-xs cursor-pointer"
            title="Share with client"
          >
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Client Share</span>
          </button>
        </div>
      </div>

      {/* Primary Project Tabs Navigation */}
      <div className="border-b border-border/80 bg-card/60 rounded-xl p-1 flex items-center gap-1 shadow-xs flex-wrap">
        <button
          onClick={() => handleTabChange("progress")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "progress"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="font-display">Work Progress</span>
        </button>

        <button
          onClick={() => handleTabChange("dev-progress")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "dev-progress"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="font-display">Developer Progress</span>
          {assignments.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === "dev-progress" ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              {assignments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("tasks")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "tasks"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Kanban className="h-3.5 w-3.5" />
          <span className="font-display">Task Board</span>
          {comments.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "tasks" ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              {comments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange("settings")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "settings"
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="font-display">Project Settings</span>
          {sessionStats?.activeSessions > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {sessionStats.activeSessions} active
            </span>
          )}
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: WORK PROGRESS */}
      {/* ================================================================= */}
      {activeTab === "progress" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Progress Overview & Metric Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between">
              <TaskProgressMeter
                total={comments.length}
                resolved={resolvedCount}
                inProgress={inProgressCount}
                pending={pendingCount}
                size="lg"
                showBreakdown={true}
                showLabel={true}
              />
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Pages Directory</span>
                <div className="size-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {pages.length}
                </span>
                <span className="text-xs text-muted-foreground">Configured</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Team Contractors</span>
                <div className="size-7 rounded-xl bg-sky-100 flex items-center justify-center text-sky-800">
                  <Users className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {assignments.filter((a) => a.isActive).length}
                </span>
                <span className="text-xs text-muted-foreground">Active Grants</span>
              </div>
            </div>
          </div>

          {/* Interactive Staging Stage Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Responsive Viewports</span>
                </span>
                <span className="text-xs text-muted-foreground">Desktop 1440px &bull; Tablet 768px &bull; Mobile 375px</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Live Interactive Website Annotator
              </h2>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Inspect responsive rendering, drop coordinate-exact feedback pins directly onto live HTML elements, and track developer task resolution in real time.
              </p>
            </div>

            <Link
              href={`/preview/${projectId}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-3 text-xs font-semibold text-white shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Eye className="h-4 w-4" />
              <span>Launch Canvas Preview</span>
            </Link>
          </div>

          {/* Recent Visual Tasks / Annotations Feed */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-border/80 bg-secondary/30 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  Recent Pin Annotations & Feedback ({comments.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Visual tasks pinned directly to client site DOM elements.
                </p>
              </div>

              <button
                onClick={() => handleTabChange("tasks")}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All on Kanban</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {comments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No visual annotations dropped yet. Open the Visual Preview canvas to drop your first pin!
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {comments.slice(0, 6).map((c) => (
                  <div key={c.id} className="p-4 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 font-display font-bold text-xs mt-0.5">
                        {c.authorUser?.name ? c.authorUser.name.charAt(0).toUpperCase() : "C"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground font-display">
                            {c.authorUser?.name || c.guestAuthorName || "Client"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            on <code className="font-mono text-foreground font-semibold">{c.page?.path || "/"}</code>
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 line-clamp-1">
                          {c.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                          c.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : c.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-900 border-blue-300"
                            : "bg-amber-100 text-amber-900 border-amber-300"
                        }`}
                      >
                        {c.status.replace("_", " ")}
                      </span>

                      <Link
                        href={`/preview/${projectId}?commentId=${c.id}`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Inspect on live preview"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: DEVELOPER PROGRESS (PER-PROJECT TRACKING & VELOCITY) */}
      {/* ================================================================= */}
      {activeTab === "dev-progress" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Context & Actions Header */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Productivity & Task Tracking</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Developer Progress & Work Velocity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Monitor individual task completion rates, active WordPress logins, and access security for all contractors on {project?.name}.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleSubTabChange("sessions")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>Verify All Login Sessions</span>
                {sessionStats?.activeSessions > 0 && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (availableDevelopers.length > 0) setSelectedUserId(availableDevelopers[0].id);
                  setIsAssignModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Assign Developer</span>
              </button>
            </div>
          </div>

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Contractors */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Contractors Assigned</span>
                <div className="size-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {assignments.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({assignments.filter((a) => a.isActive).length} active grants)
                </span>
              </div>
            </div>

            {/* Total Project Tasks */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Total Tasks</span>
                <div className="size-7 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                  <ListTodo className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {comments.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({comments.filter((c) => c.assigneeUserId || c.assigneeUser?.id).length} assigned)
                </span>
              </div>
            </div>

            {/* Overall Completion Velocity */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Overall Velocity</span>
                <div className="size-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <Award className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-emerald-600">
                  {comments.length > 0
                    ? `${Math.round((comments.filter((c) => c.status === "RESOLVED").length / comments.length) * 100)}%`
                    : "100%"}
                </span>
                <span className="text-xs text-muted-foreground">tasks resolved</span>
              </div>
            </div>

            {/* Active WP Sessions */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wider">Active WP Sessions</span>
                <div className="size-7 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <Activity className="size-3.5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  {sessionStats?.activeSessions || 0}
                  {sessionStats?.activeSessions > 0 && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </span>
                <span className="text-xs text-muted-foreground">working right now</span>
              </div>
            </div>
          </div>

          {/* Contractors Detailed Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-foreground">
                Assigned Contractors & Task Velocity ({assignments.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                Tasks assigned, pending, in-progress, and resolved per developer
              </span>
            </div>

            {assignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card p-10 text-center space-y-3">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                  <Users className="size-6" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-foreground">No Developers Assigned Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                    Assign a contractor or developer to this project to track their individual progress velocity and grant zero-trust WordPress access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (availableDevelopers.length > 0) setSelectedUserId(availableDevelopers[0].id);
                    setIsAssignModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Assign First Contractor</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {assignments.map((a) => {
                  const expiryInfo = formatAccessExpiry(a.expiresAt);
                  const devTasks = comments.filter((c) => (c.assigneeUserId === a.userId) || (c.assigneeUser?.id === a.userId));
                  const devResolved = devTasks.filter((c) => c.status === "RESOLVED").length;
                  const devInProg = devTasks.filter((c) => c.status === "IN_PROGRESS").length;
                  const devPending = devTasks.filter((c) => c.status === "PENDING").length;
                  const devVelocity = devTasks.length > 0 ? Math.round((devResolved / devTasks.length) * 100) : 0;

                  const devSessions = sessions.filter((s) => s.developer.id === a.userId);
                  const activeDevSession = devSessions.find((s) => s.status === "ACTIVE");
                  const latestDevSession = devSessions[0];

                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4 hover:border-border transition-all"
                    >
                      {/* Developer Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm shadow-xs font-display">
                            {a.user.name ? a.user.name.charAt(0).toUpperCase() : "D"}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-display text-sm font-bold text-foreground truncate">
                              {a.user.name}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate font-mono">
                              {a.user.email}
                            </p>
                          </div>
                        </div>

                        {/* Role Template Badge */}
                        <span
                          className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                            a.wpRoleTemplate === "RESTRICTED_ADMIN"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : a.wpRoleTemplate === "EDITOR"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          <span>
                            {a.wpRoleTemplate === "RESTRICTED_ADMIN"
                              ? "Restricted Admin"
                              : a.wpRoleTemplate === "EDITOR"
                              ? "Editor"
                              : "Shop Manager"}
                          </span>
                        </span>
                      </div>

                      {/* Live Session Sentinel Banner */}
                      <div
                        className={`rounded-xl p-3 border text-xs flex items-center justify-between gap-3 ${
                          activeDevSession
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                            : a.isRevoked
                            ? "bg-rose-50/60 border-rose-200 text-rose-950"
                            : a.isExpired
                            ? "bg-amber-50/60 border-amber-200 text-amber-950"
                            : "bg-secondary/40 border-border/80 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {activeDevSession ? (
                            <>
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                              </span>
                              <div className="truncate">
                                <span className="font-bold">Active in WordPress right now</span>
                                <span className="text-[11px] text-emerald-700 block truncate">
                                  {activeDevSession.device} &bull; {activeDevSession.ipAddress}
                                </span>
                              </div>
                            </>
                          ) : latestDevSession ? (
                            <>
                              <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="truncate text-muted-foreground">
                                <span>Last session: </span>
                                <span className="font-medium text-foreground">{latestDevSession.device}</span>
                                <span className="text-[11px] block">
                                  {new Date(latestDevSession.createdAt).toLocaleDateString()} at{" "}
                                  {new Date(latestDevSession.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground italic">
                                No login sessions generated yet
                              </span>
                            </>
                          )}
                        </div>

                        {activeDevSession && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(activeDevSession.id)}
                            disabled={isRevokingSessionId === activeDevSession.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-700 transition-all cursor-pointer shadow-2xs shrink-0"
                            title="Instantly terminate this developer's active WordPress session"
                          >
                            {isRevokingSessionId === activeDevSession.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Power className="h-3 w-3 text-rose-600" />
                            )}
                            <span>Revoke Session</span>
                          </button>
                        )}
                      </div>

                      {/* Progress & Velocity Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">Task Resolution Velocity</span>
                          <span className="font-bold text-primary font-mono">{devVelocity}%</span>
                        </div>

                        {/* Stacked Progress Bar */}
                        <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden flex shadow-inner">
                          {devTasks.length > 0 ? (
                            <>
                              <div
                                style={{ width: `${(devResolved / devTasks.length) * 100}%` }}
                                className="bg-emerald-500 transition-all duration-300"
                                title={`Resolved: ${devResolved}`}
                              />
                              <div
                                style={{ width: `${(devInProg / devTasks.length) * 100}%` }}
                                className="bg-blue-500 transition-all duration-300"
                                title={`In Progress: ${devInProg}`}
                              />
                              <div
                                style={{ width: `${(devPending / devTasks.length) * 100}%` }}
                                className="bg-amber-400 transition-all duration-300"
                                title={`Pending: ${devPending}`}
                              />
                            </>
                          ) : (
                            <div className="w-full bg-muted/40" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-muted-foreground">
                            {devResolved} of {devTasks.length} tasks completed
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-800 font-semibold">{devPending} pending</span>
                            <span>&bull;</span>
                            <span className="text-blue-800 font-semibold">{devInProg} in-progress</span>
                            <span>&bull;</span>
                            <span className="text-emerald-800 font-semibold">{devResolved} resolved</span>
                          </div>
                        </div>
                      </div>

                      {/* Access Window & Footer Actions */}
                      <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Expires: </span>
                          <span className="font-semibold text-foreground">{expiryInfo.formatted}</span>
                          <span className="text-[11px] text-muted-foreground">({expiryInfo.relative})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExtendSevenDays(a.id, a.expiresAt)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/60 hover:bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                            title="Extend access grant by 7 more days"
                          >
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>+7 Days</span>
                          </button>

                          {a.isActive && (
                            <button
                              type="button"
                              onClick={() => handleRevokeAssignment(a.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-all cursor-pointer shadow-2xs"
                              title="Immediately revoke access"
                            >
                              <UserX className="h-3 w-3" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: TASK BOARD (FULL PANORAMIC KANBAN) */}
      {/* ================================================================= */}
      {activeTab === "tasks" && (
        <div className="space-y-5 animate-in fade-in">
          {/* Controls Bar: Search, Filters, View Mode & "+ Add Task" Button */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
            {/* Left: Search input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search tasks, descriptions, authors, pages..."
                className="w-full rounded-xl border border-border/80 bg-background pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
              {taskSearch && (
                <button
                  onClick={() => setTaskSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Middle: Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Page filter */}
              <select
                value={taskPageFilter}
                onChange={(e) => setTaskPageFilter(e.target.value)}
                className="rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
              >
                <option value="">All Pages ({pages.length})</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.path}
                  </option>
                ))}
              </select>

              {/* Priority filter */}
              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">🔥 Urgent</option>
                <option value="HIGH">⚡ High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* View Switcher: Kanban vs List */}
              <div className="flex items-center rounded-xl border border-border/80 bg-background p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTaskViewMode("kanban")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    taskViewMode === "kanban"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Kanban Board View"
                >
                  <Kanban className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTaskViewMode("list")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    taskViewMode === "list"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="List View"
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>

            {/* Right: Primary "+ Add Task" Button */}
            <button
              type="button"
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold px-4 py-2 text-xs transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Kanban Columns Grid or List View */}
          {taskViewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {/* Column 1: PENDING / To Do */}
              <div
                onDragOver={(e) => handleDragOver(e, "PENDING")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "PENDING")}
                className={`flex flex-col rounded-2xl border p-4 bg-slate-50/50 min-h-[560px] transition-all duration-200 ${
                  dragOverCol === "PENDING"
                    ? "border-amber-400 bg-amber-50/40 ring-2 ring-amber-300"
                    : "border-border/80"
                }`}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                      To Do / Pending
                    </h3>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-xs font-bold font-mono">
                    {pendingFilteredTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {pendingFilteredTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={{
                        ...task,
                        projectId,
                        project: project ? { id: projectId, name: project.name, clientName: project.clientName } : null,
                      }}
                      onOpen={() => handleOpenDrawer(task)}
                      onDragStart={handleDragStart}
                      onStatusChange={handleUpdateTaskStatus}
                      showProjectBadge={false}
                    />
                  ))}
                  {pendingFilteredTasks.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl flex flex-col items-center justify-center p-4">
                      <span>No pending tasks matching filters</span>
                      <button
                        onClick={() => setIsCreateTaskModalOpen(true)}
                        className="mt-2 text-primary font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Create a task</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: IN_PROGRESS */}
              <div
                onDragOver={(e) => handleDragOver(e, "IN_PROGRESS")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "IN_PROGRESS")}
                className={`flex flex-col rounded-2xl border p-4 bg-slate-50/50 min-h-[560px] transition-all duration-200 ${
                  dragOverCol === "IN_PROGRESS"
                    ? "border-sky-400 bg-sky-50/40 ring-2 ring-sky-300"
                    : "border-border/80"
                }`}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
                    <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                      In Progress
                    </h3>
                  </div>
                  <span className="rounded-full bg-sky-100 text-sky-900 border border-sky-300 px-2 py-0.5 text-xs font-bold font-mono">
                    {inProgressFilteredTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {inProgressFilteredTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={{
                        ...task,
                        projectId,
                        project: project ? { id: projectId, name: project.name, clientName: project.clientName } : null,
                      }}
                      onOpen={() => handleOpenDrawer(task)}
                      onDragStart={handleDragStart}
                      onStatusChange={handleUpdateTaskStatus}
                      showProjectBadge={false}
                    />
                  ))}
                  {inProgressFilteredTasks.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl">
                      Drag cards here when work starts
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: RESOLVED / Done */}
              <div
                onDragOver={(e) => handleDragOver(e, "RESOLVED")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "RESOLVED")}
                className={`flex flex-col rounded-2xl border p-4 bg-slate-50/50 min-h-[560px] transition-all duration-200 ${
                  dragOverCol === "RESOLVED"
                    ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-300"
                    : "border-border/80"
                }`}
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <h3 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                      Resolved / Done
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-xs font-bold font-mono">
                    {resolvedFilteredTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {resolvedFilteredTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={{
                        ...task,
                        projectId,
                        project: project ? { id: projectId, name: project.name, clientName: project.clientName } : null,
                      }}
                      onOpen={() => handleOpenDrawer(task)}
                      onDragStart={handleDragStart}
                      onStatusChange={handleUpdateTaskStatus}
                      showProjectBadge={false}
                    />
                  ))}
                  {resolvedFilteredTasks.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl">
                      No resolved tasks yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Detailed List View */
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs divide-y divide-border/60">
              {filteredComments.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No tasks found matching your filters.
                </div>
              ) : (
                filteredComments.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleOpenDrawer(c)}
                    className="p-4 hover:bg-secondary/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            c.priority === "URGENT"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : c.priority === "HIGH"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : c.priority === "LOW"
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-sky-50 text-sky-800 border-sky-200"
                          }`}
                        >
                          {c.priority || "MEDIUM"}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50">
                          {c.page?.path || "/"}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {c.authorUser?.name || c.guestAuthorName || "Client"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          • {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">
                        {c.title || c.content}
                      </p>
                      {c.title && c.content !== c.title && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {c.content}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          c.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                            : c.status === "IN_PROGRESS"
                            ? "bg-sky-100 text-sky-900 border-sky-300"
                            : "bg-amber-100 text-amber-900 border-amber-300"
                        }`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                      <Link
                        href={`/preview/${projectId}?commentId=${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                        title="Inspect pinpoint on live preview"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Slide-over Inspection Drawer for Active Task */}
          {isDrawerOpen && activeDrawerTask && (
            <Portal>
              <div
                className="fixed inset-0 z-[70] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
                onClick={handleCloseDrawer}
              >
                <div
                  className="w-full max-w-xl bg-card border-l border-border h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                        activeDrawerTask.priority === "URGENT"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : activeDrawerTask.priority === "HIGH"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-sky-50 text-sky-800 border-sky-200"
                      }`}
                    >
                      {activeDrawerTask.priority || "MEDIUM"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground font-semibold">
                      {activeDrawerTask.page?.path || "/"}
                    </span>
                  </div>
                  <button
                    onClick={handleCloseDrawer}
                    className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {/* Status Switcher Buttons */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Progression Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskStatus(activeDrawerTask.id, "PENDING")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          activeDrawerTask.status === "PENDING"
                            ? "bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        To Do
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskStatus(activeDrawerTask.id, "IN_PROGRESS")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          activeDrawerTask.status === "IN_PROGRESS"
                            ? "bg-sky-100 text-sky-900 border-sky-400 ring-2 ring-sky-300"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskStatus(activeDrawerTask.id, "RESOLVED")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          activeDrawerTask.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-300"
                            : "border-border bg-card text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        Resolved
                      </button>
                    </div>
                  </div>

                  {/* Task Content Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Task Content / Feedback Instructions
                      </label>
                      <Link
                        href={`/preview/${projectId}?commentId=${activeDrawerTask.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect in Visual Preview &rarr;</span>
                      </Link>
                    </div>

                    {activeDrawerTask.title && (
                      <h3 className="text-sm font-bold text-foreground mb-1.5">
                        {activeDrawerTask.title}
                      </h3>
                    )}

                    <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {activeDrawerTask.content}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Author: {activeDrawerTask.authorUser?.name || activeDrawerTask.guestAuthorName || "Reviewer"}</span>
                      <span>Added: {new Date(activeDrawerTask.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Developer Technical Notes */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                        <StickyNote className="h-4 w-4 text-emerald-600" />
                        <span>Technical Notes & Solutions</span>
                      </div>
                      {!isEditingNotes && (
                        <button
                          type="button"
                          onClick={() => setIsEditingNotes(true)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>{activeDrawerTask.notes ? "Edit Note" : "+ Add Note"}</span>
                        </button>
                      )}
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Add technical notes, solutions, reproduction steps, or PR links..."
                          className="w-full rounded-xl border border-emerald-300 bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNotesText(activeDrawerTask.notes || "");
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
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {isSavingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            <span>Save Note</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {activeDrawerTask.notes ? (
                          <p className="text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed">
                            {activeDrawerTask.notes}
                          </p>
                        ) : (
                          <p className="text-xs text-emerald-800/60 italic">
                            No technical notes attached yet. Click &quot;+ Add Note&quot; to keep developer solution logs.
                          </p>
                        )}
                      </div>
                    )}

                    {notesSuccess && (
                      <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                        {notesSuccess}
                      </div>
                    )}
                  </div>

                  {/* Threaded Discussion Section */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      <MessageSquare className="h-4 w-4" />
                      <span>Threaded Discussion & Queries ({(activeDrawerTask.replies || []).length})</span>
                    </div>

                    <div className="space-y-3 mb-4">
                      {(activeDrawerTask.replies || []).length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                          No replies or queries posted yet.
                        </div>
                      ) : (
                        (activeDrawerTask.replies || []).map((reply) => {
                          const isDev = reply.authorUser?.role === "DEVELOPER";
                          const isAdmin = reply.authorUser?.role === "ADMIN";
                          return (
                            <div
                              key={reply.id}
                              className={`rounded-xl border p-3.5 ${
                                isAdmin
                                  ? "bg-indigo-50/60 border-indigo-200"
                                  : isDev
                                  ? "bg-sky-50/60 border-sky-200"
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
                                      isAdmin
                                        ? "bg-indigo-100 text-indigo-800"
                                        : isDev
                                        ? "bg-sky-100 text-sky-800"
                                        : "bg-secondary text-secondary-foreground"
                                    }`}
                                  >
                                    {isAdmin ? "Agency Owner" : isDev ? "Developer" : "Client"}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleDateString()}
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

                    {/* Reply Input Form */}
                    <form onSubmit={handleSendReply} className="space-y-2">
                      <textarea
                        rows={3}
                        placeholder="Post a query, response, or instruction..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                      />
                      <div className="flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={isSubmittingReply || !replyText.trim()}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                        >
                          {isSubmittingReply ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          <span>Post Reply</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
          )}

          {/* Create Task Modal */}
          <CreateTaskModal
            isOpen={isCreateTaskModalOpen}
            onClose={() => setIsCreateTaskModalOpen(false)}
            projectId={projectId}
            projectName={project?.name || "Project"}
            pages={pages.map((p) => ({ id: p.id, path: p.path, title: p.title }))}
            assignees={assignments.map((a) => ({ id: a.user.id, name: a.user.name, email: a.user.email, role: a.wpRoleTemplate }))}
            onTaskCreated={handleTaskCreated}
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: SETTINGS (WITH NESTED VERTICAL SUB-SIDEBAR) */}
      {/* ================================================================= */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
          {/* Nested Sub-Sidebar */}
          <div className="md:col-span-1 space-y-1 rounded-2xl border border-border/80 bg-card p-2 shadow-xs h-fit">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Project Configuration
            </div>

            <button
              onClick={() => handleSubTabChange("details")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "details"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <FolderKanban className="h-4 w-4 shrink-0" />
              <span className="font-display">Project Details & Meta</span>
            </button>

            <button
              onClick={() => handleSubTabChange("sessions")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "sessions"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 shrink-0" />
                <span className="font-display">Login Sessions & Sentinel</span>
              </div>
              {sessionStats?.activeSessions > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeSubTab === "sessions" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {sessionStats.activeSessions}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSubTabChange("team")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "team"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="font-display">Team Access Grants</span>
            </button>

            <button
              onClick={() => handleSubTabChange("pages")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "pages"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="font-display">Pages Directory</span>
            </button>

            <button
              onClick={() => handleSubTabChange("vault")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "vault"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              <span className="font-display">Credentials & Vault</span>
            </button>

            <button
              onClick={() => handleSubTabChange("channel")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "channel"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Sliders className="h-4 w-4 shrink-0" />
              <span className="font-display">Access Channels</span>
            </button>

            <button
              onClick={() => handleSubTabChange("danger")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === "danger"
                  ? "bg-destructive text-white shadow-sm"
                  : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              }`}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="font-display">Danger Zone</span>
            </button>
          </div>

          {/* Right Settings Content Stage */}
          <div className="md:col-span-3 space-y-6">
            {/* SUBTAB 1: PROJECT DETAILS & METADATA (EDITABLE) */}
            {activeSubTab === "details" && (
              <form onSubmit={handleSaveProjectDetails} className="space-y-6 animate-in fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Project Details & System Metadata
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Update project stage, client linkage, technology stack, target URL, and banner asset.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingDetails}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingDetails ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>{isSavingDetails ? "Saving Changes..." : "Save Changes"}</span>
                  </button>
                </div>

                {/* 1. Project Identity Card */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/80">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                      1. Project Identity & Client Linkage
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Project Name */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Project Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Apex Luxury Watches"
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                      />
                    </div>

                    {/* Client Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1 flex items-center justify-between">
                        <span>Linked Agency Client</span>
                        <Link href="/admin/clients" className="text-[10px] text-primary hover:underline">
                          Manage Clients &rarr;
                        </Link>
                      </label>
                      <select
                        value={editClientId}
                        onChange={(e) => setEditClientId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                      >
                        <option value="">No client linked (Internal project)</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.company ? `(${c.company})` : ""} &lt;{c.email}&gt;
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target URL */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Target Live / Staging Website URL <span className="text-destructive">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="url"
                            required
                            value={editTargetUrl}
                            onChange={(e) => setEditTargetUrl(e.target.value)}
                            placeholder="https://client-staging.agency.com"
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                          />
                          <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                        {editTargetUrl && (
                          <a
                            href={editTargetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3.5 h-10 rounded-xl border border-border/80 bg-secondary/60 hover:bg-secondary text-xs font-semibold text-foreground transition-all cursor-pointer shrink-0 shadow-2xs"
                            title="Open URL in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Test Link</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Technology Stack / Category Card */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/80">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                        2. Technology Stack & Platform
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-primary font-mono">{editCategory}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const isSelected = editCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setEditCategory(cat.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                              : "border-border/80 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/40"
                          }`}
                        >
                          <span
                            className={`text-xs font-bold font-display ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                            {cat.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Project Stage Card */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/80">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                        3. Project Lifecycle Stage
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-primary font-mono">{editStage}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STAGES.map((stg) => {
                      const isSelected = editStage === stg.id;
                      return (
                        <button
                          key={stg.id}
                          type="button"
                          onClick={() => setEditStage(stg.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                              : "border-border/80 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold font-display ${
                                isSelected ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {stg.label}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {stg.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Timeline & Viewport Settings */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/80">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                      4. Timeline, Status & Viewport Default
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Project Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                      >
                        <option value="ACTIVE">ACTIVE (In Progress)</option>
                        <option value="ARCHIVED">ARCHIVED (Read-Only)</option>
                      </select>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer font-mono"
                      />
                    </div>

                    {/* Target Deadline */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Target / Due Date
                      </label>
                      <input
                        type="date"
                        value={editTargetDate}
                        onChange={(e) => setEditTargetDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer font-mono"
                      />
                    </div>

                    {/* Default Viewport */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Default Preview Viewport
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: "desktop", label: "Desktop", desc: "1440px wide", icon: Monitor },
                          { id: "tablet", label: "Tablet", desc: "768px wide", icon: Tablet },
                          { id: "mobile", label: "Mobile", desc: "375px wide", icon: Smartphone },
                        ].map((vp) => {
                          const IconComp = vp.icon;
                          const isSelected = editDefaultViewport === vp.id;
                          return (
                            <button
                              key={vp.id}
                              type="button"
                              onClick={() => setEditDefaultViewport(vp.id)}
                              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                                isSelected
                                  ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                                  : "border-border/80 bg-secondary/30 hover:bg-secondary/60"
                              }`}
                            >
                              <IconComp className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {vp.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{vp.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Cover Banner Drag & Drop Firebase Uploader */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/80">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wider">
                      5. Project Cover Banner & Brand Asset
                    </h4>
                  </div>

                  <ImageDropzone
                    value={editImageUrl}
                    onChange={(url) => setEditImageUrl(url)}
                    folder="project-covers"
                    label="Project Banner & Cover Image"
                    description="Drag & drop new thumbnail image or mockups here, stored directly in Firebase Cloud Storage."
                  />
                </div>

                {/* Sticky Action Footer */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingDetails}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-6 py-2.5 text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingDetails ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{isSavingDetails ? "Saving Project Changes..." : "Save Project Changes"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* SUBTAB 2: LOGIN SESSIONS & SENTINEL */}
            {activeSubTab === "sessions" && (
              <div className="space-y-6 animate-in fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-1">
                      <Activity className="h-3.5 w-3.5" />
                      <span>Zero-Trust Access Sentinel</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Developer Login Sessions & Security Sentinel
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verify active developer logins, identify client operating systems and browsers, and instantly revoke any session or purge all active grants.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={fetchSessions}
                      disabled={isLoadingSessions}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 hover:bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                      title="Refresh session list"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePurgeAllSessions}
                      disabled={isPurgingSessions || !sessionStats || sessionStats.activeSessions === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-destructive hover:bg-destructive/90 px-3.5 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                      title="Terminate all active developer WordPress sessions for this project"
                    >
                      {isPurgingSessions ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      <span>Purge All Active Sessions</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Total Grants
                    </span>
                    <span className="font-display text-xl font-bold text-foreground mt-1 block">
                      {sessionStats?.totalGrants || 0}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Active Working Now
                    </span>
                    <span className="font-display text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                      {sessionStats?.activeSessions || 0}
                      {sessionStats?.activeSessions > 0 && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Unique Contractors
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-xl font-bold text-foreground">
                        {sessionStats?.uniqueDevelopers || 0}
                      </span>
                      {sessionStats?.adminSessionsCount > 0 && (
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          +{sessionStats.adminSessionsCount} Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Revoked Sessions
                    </span>
                    <span className="font-display text-xl font-bold text-rose-600 mt-1 block">
                      {sessionStats?.revokedCount || 0}
                    </span>
                  </div>
                </div>

                {/* Filter Tabs & Scope Toggle */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="inline-flex items-center rounded-xl border border-border/80 bg-secondary/50 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setSessionFilter("ALL")}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        sessionFilter === "ALL"
                          ? "bg-card text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All Grants ({sessions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionFilter("DEVELOPERS")}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        sessionFilter === "DEVELOPERS"
                          ? "bg-card text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Contractors & Devs ({sessions.filter((s) => !s.isAdmin && s.developer.role !== "ADMIN").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionFilter("ADMIN")}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                        sessionFilter === "ADMIN"
                          ? "bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Admin Sessions ({sessions.filter((s) => s.isAdmin || s.developer.role === "ADMIN").length})
                    </button>
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    Zero-Trust sentinel expires active sessions immediately without removing contractors from the project.
                  </div>
                </div>

                {/* Sessions Table / List */}
                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                  {isLoadingSessions ? (
                    <div className="p-10 flex flex-col items-center justify-center gap-2 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Checking live session grants & sentinel logs...</span>
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <ShieldCheck className="h-8 w-8 text-primary/60 mx-auto" />
                      <h4 className="font-display text-sm font-bold text-foreground">
                        {sessionFilter === "ADMIN"
                          ? "No Admin Sessions Recorded"
                          : sessionFilter === "DEVELOPERS"
                          ? "No Developer Sessions Recorded"
                          : "No Sessions Dispatched Yet"}
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        {sessionFilter === "ADMIN"
                          ? "Whenever you launch zero-trust WordPress access as an administrator, your authenticated grant will be tracked here."
                          : "When an assigned developer launches zero-trust WordPress access via the browser companion or proxy, their authenticated session, device, and browser telemetry will appear here."}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border/80 bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Identity & Role</th>
                          <th className="px-4 py-3">Device & Browser</th>
                          <th className="px-4 py-3">IP Address</th>
                          <th className="px-4 py-3">Session Status</th>
                          <th className="px-4 py-3">Logged In / Dispatched</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredSessions.map((s) => {
                          const isLaptop = s.os === "Windows" || s.os === "macOS" || s.os === "Linux";
                          const isSelf = s.isCurrentUser;
                          const isAdm = s.isAdmin || s.developer.role === "ADMIN";

                          return (
                            <tr
                              key={s.id}
                              className={`transition-colors ${
                                isSelf
                                  ? "bg-purple-500/[0.04] border-l-2 border-l-purple-500 hover:bg-purple-500/[0.08]"
                                  : isAdm
                                  ? "bg-indigo-500/[0.02] border-l-2 border-l-indigo-400 hover:bg-indigo-500/[0.06]"
                                  : "hover:bg-secondary/30"
                              }`}
                            >
                              {/* Identity */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <UserAvatar
                                    user={{
                                      name: s.developer.name || "Contractor",
                                      avatarUrl: s.developer.avatarUrl,
                                      email: s.developer.email,
                                    }}
                                    size="sm"
                                    withRing={true}
                                    className={`h-8 w-8 rounded-xl shrink-0 ${
                                      isSelf ? "ring-purple-400/80" : ""
                                    }`}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 font-bold text-foreground truncate">
                                      <span className="truncate">{s.developer.name}</span>
                                      {isSelf ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 text-purple-800 dark:bg-purple-900/40 dark:border-purple-800 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                                          You (Admin)
                                        </span>
                                      ) : isAdm ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-800 dark:bg-indigo-900/40 dark:border-indigo-800 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                                          Admin
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-200 text-sky-800 dark:bg-sky-900/40 dark:border-sky-800 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                                          Contractor
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                                      {s.developer.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Device & Browser */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  {isLaptop ? (
                                    <Laptop className="h-4 w-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="font-medium text-foreground">{s.device}</span>
                                </div>
                              </td>

                              {/* IP Address */}
                              <td className="px-4 py-3.5">
                                <code className="text-[11px] font-mono text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded">
                                  {s.ipAddress}
                                </code>
                              </td>

                              {/* Status Badge */}
                              <td className="px-4 py-3.5">
                                {s.status === "ACTIVE" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Active Now</span>
                                  </span>
                                ) : s.status === "PENDING_DISPATCH" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold">
                                    <Clock className="h-3 w-3 text-amber-500" />
                                    <span>Awaiting Claim</span>
                                  </span>
                                ) : s.status === "CONSUMED" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold">
                                    <span>Claimed</span>
                                  </span>
                                ) : s.status === "REVOKED" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold">
                                    <span>Revoked</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border text-muted-foreground px-2.5 py-0.5 text-[10px] font-bold">
                                    <span>Expired</span>
                                  </span>
                                )}
                              </td>

                              {/* Timestamps */}
                              <td className="px-4 py-3.5 text-muted-foreground">
                                <div>
                                  {new Date(s.createdAt).toLocaleDateString()}{" "}
                                  <span className="text-[10px]">
                                    {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              </td>

                              {/* Action */}
                              <td className="px-4 py-3.5 text-right">
                                {s.status === "ACTIVE" || s.status === "PENDING_DISPATCH" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeSession(s.id, isSelf)}
                                    disabled={isRevokingSessionId === s.id}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs border ${
                                      isSelf
                                        ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                                        : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400"
                                    }`}
                                    title={
                                      isSelf
                                        ? "Revoke and terminate your own active WordPress session"
                                        : "Revoke and terminate this developer's WordPress session immediately (project assignment remains active)"
                                    }
                                  >
                                    {isRevokingSessionId === s.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Power className="h-3 w-3" />
                                    )}
                                    <span>{isSelf ? "Revoke My Session" : "Revoke Session"}</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    Inactive
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Informational Policy Banner */}
                  <div className="border-t border-border/80 bg-secondary/30 px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Zero-Trust Sentinel Policy:</strong> Revoking an active session immediately terminates that user&apos;s WordPress login access and purges browser cookies. Team project assignments and task allocations remain active.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 3: TEAM ACCESS */}
            {activeSubTab === "team" && (
              <div className="space-y-5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-bold text-foreground">
                      Developer & Contractor Access Grants
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Time-bound zero-trust login into WordPress Admin without master credentials.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (availableDevelopers.length > 0) setSelectedUserId(availableDevelopers[0].id);
                      setIsAssignModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Assign Developer</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border/80 bg-secondary/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5">Developer / Contractor</th>
                        <th className="px-5 py-3.5">Role Template</th>
                        <th className="px-5 py-3.5">Access Status</th>
                        <th className="px-5 py-3.5">Expiration</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {assignments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                            No developers assigned yet. Click &quot;Assign Developer&quot; above.
                          </td>
                        </tr>
                      ) : (
                        assignments.map((a) => {
                          const expiryInfo = formatAccessExpiry(a.expiresAt);
                          return (
                            <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                              {/* Developer column with avatar */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    user={{
                                      name: a.user.name,
                                      avatarUrl: a.user.avatarUrl,
                                      email: a.user.email,
                                      status: (a.user as any)?.status,
                                    }}
                                    size="sm"
                                    withRing={true}
                                    showStatusIndicator={true}
                                  />
                                  <div className="min-w-0">
                                    <div className="font-display text-xs font-bold text-foreground truncate">
                                      {a.user.name}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                                      {a.user.email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Role Badge */}
                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                                    a.wpRoleTemplate === "RESTRICTED_ADMIN"
                                      ? "bg-indigo-50/80 text-indigo-700 border-indigo-200"
                                      : a.wpRoleTemplate === "EDITOR"
                                      ? "bg-emerald-50/80 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50/80 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  <Shield className="h-3 w-3" />
                                  <span>
                                    {a.wpRoleTemplate === "RESTRICTED_ADMIN"
                                      ? "Restricted Admin"
                                      : a.wpRoleTemplate === "EDITOR"
                                      ? "Content Editor"
                                      : "Shop Manager"}
                                  </span>
                                </span>
                              </td>

                              {/* Status Column */}
                              <td className="px-5 py-3.5">
                                {(a.user as any)?.status === "SUSPENDED" ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold">
                                    <ShieldAlert className="h-3 w-3 text-rose-500" />
                                    <span>Suspended</span>
                                  </span>
                                ) : a.isRevoked ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    <span>Revoked</span>
                                  </span>
                                ) : a.isExpired ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 text-[10px] font-bold">
                                    <Clock className="h-3 w-3 text-amber-500" />
                                    <span>Expired</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Active Grant</span>
                                  </span>
                                )}
                              </td>

                              {/* Expiration Column */}
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-semibold text-foreground">
                                    {expiryInfo.formatted}
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium ${
                                      expiryInfo.isExpired
                                        ? "text-rose-600 font-bold"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {expiryInfo.relative}
                                  </span>
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleExtendSevenDays(a.id, a.expiresAt)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/60 hover:bg-primary/10 hover:border-primary/40 hover:text-primary px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs active:scale-95"
                                    title="Extend access grant by 7 more days"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>+7 Days</span>
                                  </button>

                                  {a.isActive ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeAssignment(a.id)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 hover:border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-all cursor-pointer shadow-2xs active:scale-95"
                                      title="Immediately revoke zero-trust access grant"
                                    >
                                      <UserX className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Revoke</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground italic px-2">
                                      {a.isRevoked ? "Revoked" : "Expired"}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB: PAGES DIRECTORY */}
            {activeSubTab === "pages" && (
              <div className="space-y-6 animate-in fade-in">
                {/* 1. Website Discovery & Sync Hub */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-foreground">
                          Website Page Discovery & Auto-Sync
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Scan <code className="text-primary font-mono text-[11px] font-semibold">{project?.targetUrl}</code> to discover newly created pages during development.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleScanWebsitePages}
                      disabled={isScanningWebsite}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      title="Re-crawl website to find and sync new pages"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isScanningWebsite ? "animate-spin" : ""}`} />
                      <span>{isScanningWebsite ? "Scanning Website..." : hasScannedWebsite ? "Re-fetch / Sync Pages" : "Scan Website Pages"}</span>
                    </button>
                  </div>

                  {scanWebsiteMsg && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary font-medium">
                      {scanWebsiteMsg}
                    </div>
                  )}

                  {/* Discovered Pages List */}
                  {isScanningWebsite ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-2 text-center rounded-xl border border-dashed border-border/80 bg-secondary/30">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        Crawling website sitemap, pages, and navigation routes...
                      </span>
                    </div>
                  ) : hasScannedWebsite && discoveredWebsitePages.length > 0 && (
                    <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 space-y-3.5">
                      {/* Top Bar with Counts & Quick Action Pills */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground font-display">
                            Discovered Pages ({discoveredWebsitePages.length})
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            &bull; {discoveredWebsitePages.filter((p) => p.selected && !pages.some((ep) => ep.path === p.path)).length} selected to add
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <button
                            type="button"
                            onClick={handleSelectCoreOnlyDiscovered}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer"
                            title="Select all main navigation and core pages (excludes blog archive)"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Select Core Pages</span>
                          </button>
                          <span className="text-muted-foreground/60">&bull;</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllDiscovered(true)}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-muted-foreground/60">&bull;</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllDiscovered(false)}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      {/* Filter Pills & Fast Search */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-border/60">
                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                          {[
                            { key: "ALL", label: "All", count: discoveredWebsitePages.length },
                            {
                              key: "CORE",
                              label: "Core Pages",
                              count: discoveredWebsitePages.filter((p) => p.category === "CORE").length,
                            },
                            {
                              key: "SHOP",
                              label: "Shop & Deals",
                              count: discoveredWebsitePages.filter((p) => p.category === "SHOP").length,
                            },
                            {
                              key: "BLOG",
                              label: "Blog & Articles",
                              count: discoveredWebsitePages.filter((p) => p.category === "BLOG").length,
                            },
                            {
                              key: "LEGAL",
                              label: "Legal",
                              count: discoveredWebsitePages.filter((p) => p.category === "LEGAL").length,
                            },
                          ]
                            .filter((f) => f.key === "ALL" || f.count > 0)
                            .map((f) => (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => setPageCategoryFilter(f.key)}
                                className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                  pageCategoryFilter === f.key
                                    ? "bg-foreground text-background shadow-2xs"
                                    : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                                }`}
                              >
                                {f.label} ({f.count})
                              </button>
                            ))}
                        </div>

                        {/* Search input */}
                        <div className="relative w-full sm:w-48 shrink-0">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={pageSearchQuery}
                            onChange={(e) => setPageSearchQuery(e.target.value)}
                            placeholder="Filter by title / slug..."
                            className="w-full rounded-lg border border-input bg-background/80 py-1 pl-8 pr-2.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-all"
                          />
                        </div>
                      </div>

                      {/* Discovered Pages List */}
                      <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
                        {discoveredWebsitePages
                          .filter((dp) => {
                            if (pageCategoryFilter !== "ALL" && dp.category !== pageCategoryFilter) {
                              return false;
                            }
                            if (pageSearchQuery.trim()) {
                              const q = pageSearchQuery.toLowerCase();
                              return (
                                dp.title.toLowerCase().includes(q) ||
                                dp.path.toLowerCase().includes(q)
                              );
                            }
                            return true;
                          })
                          .map((dp) => {
                            const alreadyInProject = pages.some((p) => p.path === dp.path);
                            return (
                              <div
                                key={dp.path}
                                className={`pt-1.5 pb-1 flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 transition-colors ${
                                  alreadyInProject
                                    ? "bg-secondary/40 opacity-70"
                                    : dp.selected
                                    ? "bg-card border border-border/80 shadow-2xs"
                                    : "opacity-60 hover:opacity-100"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {alreadyInProject ? (
                                    <span className="text-emerald-600 shrink-0" title="Already added to project">
                                      <Check className="h-4 w-4" />
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSelectDiscoveredPage(dp.path)}
                                      className="cursor-pointer text-primary shrink-0"
                                      title={dp.selected ? "Deselect page" : "Select page"}
                                    >
                                      {dp.selected ? (
                                        <CheckSquare className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Square className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </button>
                                  )}

                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs font-semibold text-foreground truncate">
                                      {dp.title}
                                    </span>
                                    <code className="text-[11px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                                      {dp.path}
                                    </code>

                                    {/* Category Badge */}
                                    <span
                                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full shrink-0 border ${
                                        dp.category === "CORE"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : dp.category === "SHOP"
                                          ? "bg-purple-50 text-purple-700 border-purple-200"
                                          : dp.category === "BLOG"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : dp.category === "LEGAL"
                                          ? "bg-slate-100 text-slate-700 border-slate-200"
                                          : "bg-gray-100 text-gray-700 border-gray-200"
                                      }`}
                                    >
                                      {dp.category}
                                    </span>

                                    {alreadyInProject && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full shrink-0">
                                        In Project
                                      </span>
                                    )}
                                    {dp.isDefault && (
                                      <span className="text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.2 rounded-full shrink-0">
                                        Home
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <a
                                  href={dp.fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                  title="Open page in new tab"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            );
                          })}
                      </div>

                      {/* Add Selected Pages Action Button */}
                      {discoveredWebsitePages.some((p) => p.selected && !pages.some((ep) => ep.path === p.path)) && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddBatchPages}
                            disabled={isAddingBatchPages}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isAddingBatchPages ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            <span>
                              Add Selected (
                              {
                                discoveredWebsitePages.filter(
                                  (p) => p.selected && !pages.some((ep) => ep.path === p.path)
                                ).length
                              }
                              ) Pages to Project
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Configured Preview Pages Directory */}
                <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        Configured Preview Pages ({pages.length})
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        These pages appear in the live visual annotator dropdown and client share links.
                      </p>
                    </div>

                    <Link
                      href={`/preview/${projectId}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                      title="Open Live Preview"
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      <span>Open Preview</span>
                    </Link>
                  </div>

                  {/* Pages List */}
                  <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs divide-y divide-border/60">
                    {pages.map((p) => (
                      <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/40 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-semibold text-foreground font-display truncate">
                            {p.title}
                          </span>
                          <code className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                            {p.path}
                          </code>
                          {p.isDefault && (
                            <span className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.2 rounded-full shrink-0">
                              Home
                            </span>
                          )}
                          {p.commentCount > 0 && (
                            <span className="text-[10px] font-semibold bg-secondary text-muted-foreground px-2 py-0.2 rounded-full shrink-0">
                              {p.commentCount} {p.commentCount === 1 ? "task" : "tasks"}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleToggleHidePage(p)}
                            className="p-1.5 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground cursor-pointer hover:bg-secondary transition-colors"
                            title={p.isHidden ? "Show in preview annotator" : "Hide from preview annotator"}
                          >
                            {p.isHidden ? <EyeOff className="h-3.5 w-3.5 text-amber-500" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>

                          {!p.isDefault && p.path !== "/" && (
                            <button
                              onClick={() => handleDeletePage(p.id, p.path)}
                              disabled={isDeletingPageId === p.id}
                              className="p-1.5 rounded-lg border border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                              title="Delete page from project"
                            >
                              {isDeletingPageId === p.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. Add Custom Page Manual Form */}
                  <div className="pt-2">
                    <span className="text-xs font-semibold text-foreground block mb-2 font-display">
                      + Add Custom / Unlisted Route
                    </span>
                    <form onSubmit={handleAddPage} className="flex flex-col sm:flex-row gap-2.5 items-end rounded-xl border border-border/80 bg-secondary/30 p-3 shadow-2xs">
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Page Title</label>
                        <input
                          type="text"
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g. Services"
                          className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary shadow-xs outline-none"
                        />
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Relative Path</label>
                        <input
                          type="text"
                          required
                          value={newPath}
                          onChange={(e) => setNewPath(e.target.value)}
                          placeholder="/services"
                          className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary shadow-xs outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingPage}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isAddingPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        <span>Add Page</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: CREDENTIALS & VAULT */}
            {activeSubTab === "vault" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    WordPress Master Vault & Staging Secret
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Credentials are stored AES-256-GCM encrypted and never exposed to developers or client browsers.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-semibold">AES-256-GCM Cryptographic Protection Active</div>
                        <div className="text-[11px] text-emerald-700">Zero-Plugin server-side handshake broker.</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsVaultModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Configure Credentials</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: ACCESS CHANNELS */}
            {activeSubTab === "channel" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    WordPress Access Channel Configuration
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Control which zero-trust broker methods developers are permitted to use.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 hover:bg-secondary/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowExtensionLogin}
                      onChange={(e) => setAllowExtensionLogin(e.target.checked)}
                      className="mt-0.5 accent-primary h-4 w-4 rounded"
                    />
                    <div>
                      <div className="text-xs font-semibold text-foreground font-display">
                        Browser Companion Extension (Recommended)
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Direct session cookie injection into contractor browser memory with runtime DOM sentinels.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/80 hover:bg-secondary/30 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowProxyLogin}
                      onChange={(e) => setAllowProxyLogin(e.target.checked)}
                      className="mt-0.5 accent-primary h-4 w-4 rounded"
                    />
                    <div>
                      <div className="text-xs font-semibold text-foreground font-display">
                        Fallback Reverse Proxy Gateway
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Authenticated server reverse proxy if developer cannot install the browser extension.
                      </p>
                    </div>
                  </label>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveChannelSettings}
                      disabled={isSavingSettings}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95 cursor-pointer"
                    >
                      {isSavingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save Channels</span>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB: DANGER ZONE */}
            {activeSubTab === "danger" && (
              <div className="space-y-5 animate-in fade-in">
                <div>
                  <h3 className="font-display text-base font-bold text-destructive">
                    Danger Zone
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Irreversible actions affecting this project workspace and all visual pins.
                  </p>
                </div>

                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-xs font-bold text-foreground">Delete Project Permanently</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Wipes all annotations, assigned contractor grants, and vault credentials.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to permanently delete "${project?.name}"?`)) {
                        await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
                        router.push("/admin/projects");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-destructive hover:bg-destructive/90 px-4 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client Share Link Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={projectId}
        projectName={project?.name || "Client Project"}
        projectClient={project?.client}
      />

      {/* Credential Vault Modal */}
      {isVaultModalOpen && (
        <CredentialVaultModal
          projectId={projectId}
          projectName={project?.name || "Client Project"}
          isOpen={isVaultModalOpen}
          onClose={() => {
            setIsVaultModalOpen(false);
            fetchAllProjectData();
          }}
        />
      )}

      {/* Assign Developer Modal */}
      {isAssignModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-4">
              <h3 className="font-display text-base font-bold text-foreground">Grant Contractor Access</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAssignDeveloper} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Select Contractor</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
                >
                  {availableDevelopers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">WordPress Role Template</label>
                <select
                  value={roleTemplate}
                  onChange={(e) => setRoleTemplate(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground"
                >
                  <option value="RESTRICTED_ADMIN">Restricted Administrator</option>
                  <option value="EDITOR">Content Editor</option>
                  <option value="SHOP_MANAGER">WooCommerce Shop Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Access Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["24h", "3d", "7d", "14d", "30d"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDurationPreset(p)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                        durationPreset === p
                          ? "bg-primary text-white border-primary"
                          : "border-border/80 bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white px-4 py-1.5 text-xs font-semibold shadow-sm active:scale-95 cursor-pointer"
                >
                  {isAssigning ? "Assigning..." : "Grant Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}
    </div>
  );
}

export default function ProjectDetailMasterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-96 items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">Initializing workspace...</span>
        </div>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}
