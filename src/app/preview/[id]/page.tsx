"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ArrowLeft,
  MousePointer,
  MessageSquare,
  Search,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Loader2,
  AlertCircle
} from "lucide-react";
import PreviewWindow, { ViewportSize, Position, PreviewAnnotation } from "@/components/preview/PreviewWindow";
import TopBar from "@/components/layout/TopBar";
import CommentSidebar, { DraftPinData } from "@/components/comments/CommentSidebar";
import { CommentItem } from "@/components/comments/CommentCard";
import ShareModal from "@/components/dashboard/ShareModal";
import { isAppFullscreen, requestAppFullscreen, exitAppFullscreen } from "@/lib/fullscreen";

// Standard viewport presets
const DEVICE_PRESETS: Record<"desktop" | "tablet" | "mobile", ViewportSize> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

interface ProjectPageItem {
  id: string;
  path: string;
  fullUrl: string;
  title: string;
  isDefault: boolean;
  isHidden: boolean;
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
  pages: ProjectPageItem[];
}

function PreviewWorkspaceContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const projectId = params.id as string;
  const initialCommentId = searchParams.get("commentId");

  const [project, setProject] = useState<ProjectData | null>(null);
  const [activePage, setActivePage] = useState<ProjectPageItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Viewport & Canvas interaction state
  const [activeDevice, setActiveDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [viewportSize, setViewportSize] = useState<ViewportSize>(DEVICE_PRESETS.desktop);
  const [zoomLevel, setZoomLevel] = useState<number>(-1); // -1 = Auto-Fit screen
  const [panPosition, setPanPosition] = useState<Position>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeMode, setActiveMode] = useState<"browse" | "comment" | "inspect">("browse");

  // Comments & Annotations state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [draftPin, setDraftPin] = useState<DraftPinData | null>(null);
  const [draftScrollY, setDraftScrollY] = useState(0);
  const [pinNotification, setPinNotification] = useState<string | null>(null);
  const [hideResolved, setHideResolved] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRefreshingPages, setIsRefreshingPages] = useState(false);

  // Fetch project details and pages
  const fetchProjectData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const proj: ProjectData = data.project;
        setProject(proj);

        // Set default page or first page
        const defaultPage =
          proj.pages.find((p) => p.isDefault) ||
          proj.pages[0] || {
            id: "default",
            path: "/",
            fullUrl: proj.targetUrl,
            title: "Home",
            isDefault: true,
            isHidden: false,
          };
        setActivePage(defaultPage);
      } else if (res.status === 401) {
        router.push("/login");
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load project preview");
      }
    } catch {
      setErrorMessage("Network error connecting to project preview");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  // Fetch project comments
  const fetchComments = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/comments?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
      fetchComments();
    }
  }, [projectId, fetchProjectData, fetchComments]);

  // Handle selecting a comment: auto-snaps to exact screen size and scrolls to exact position
  const handleSelectComment = useCallback(
    (id: string | null, commentItem?: CommentItem) => {
      setSelectedPinId(id);
      if (!id) return;

      setIsSidebarOpen(true);

      const target = commentItem || comments.find((c) => c.id === id);
      if (!target) return;

      // 1. Redirect to exact screen size where the comment was made
      if (target.viewportWidth && target.viewportHeight) {
        setViewportSize({
          width: target.viewportWidth,
          height: target.viewportHeight,
        });

        if (target.viewportWidth >= 1200) {
          setActiveDevice("desktop");
        } else if (target.viewportWidth >= 600) {
          setActiveDevice("tablet");
        } else {
          setActiveDevice("mobile");
        }
      }

      // 2. If comment was made on a different registered page, switch to that page
      if (target.pageId && activePage && target.pageId !== activePage.id) {
        const matchingPage = project?.pages.find((p) => p.id === target.pageId);
        if (matchingPage) {
          setActivePage(matchingPage);
        }
      }
    },
    [comments, activePage, project]
  );

  // Auto-select and redirect to comment from URL query parameter (e.g., from task board)
  useEffect(() => {
    if (initialCommentId && comments.length > 0) {
      handleSelectComment(initialCommentId);
    }
  }, [initialCommentId, comments, handleSelectComment]);

  // Handle device switching
  const handleSelectDevice = (device: "desktop" | "tablet" | "mobile") => {
    setActiveDevice(device);
    const newSize = DEVICE_PRESETS[device];
    setViewportSize(newSize);
    setPanPosition({ x: 0, y: 0 }); // Center when snapping device
    if (selectedPinId) {
      const sel = comments.find((c) => c.id === selectedPinId);
      if (sel && (sel.viewportWidth !== newSize.width || sel.viewportHeight !== newSize.height)) {
        setSelectedPinId(null);
      }
    }
  };

  // Zoom controls (Toggle between Auto-Fit and 100% Actual Size)
  const handleResetZoomAndPan = () => {
    setZoomLevel((prev) => (prev === 100 ? -1 : 100));
    setPanPosition({ x: 0, y: 0 });
  };

  // Fullscreen toggle via HTML5 Fullscreen API
  const handleToggleFullscreen = useCallback(async () => {
    if (isAppFullscreen()) {
      await exitAppFullscreen();
      setIsFullscreen(false);
    } else {
      await requestAppFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  // Listen to browser fullscreenchange (e.g. F11, Esc, or OS actions) to synchronize UI state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isAppFullscreen());
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts (B: Browse, C: Comment, I: Inspect, Esc: Fullscreen / Deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "b" || e.key === "B") {
        setActiveMode("browse");
      } else if (e.key === "c" || e.key === "C") {
        setActiveMode("comment");
      } else if (e.key === "i" || e.key === "I") {
        setActiveMode("inspect");
      } else if (e.key === "Escape") {
        if (isAppFullscreen()) {
          exitAppFullscreen();
        }
        setIsFullscreen(false);
        setSelectedPinId(null);
        setDraftPin(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Map annotations for PreviewWindow overlay with strict screen-size restriction
  const previewAnnotations: PreviewAnnotation[] = useMemo(() => {
    const list: PreviewAnnotation[] = comments
      .filter((c) => {
        if (hideResolved && c.status === "RESOLVED") return false;
        if (activePage && c.pageId && c.pageId !== activePage.id && c.page?.path !== activePage.path) return false;

        // Strict Screen Size Matching: pin is strictly ONLY visible on its exact screen size
        if (c.viewportWidth && c.viewportWidth !== viewportSize.width) {
          return false;
        }
        if (c.viewportHeight && c.viewportHeight !== viewportSize.height) {
          return false;
        }
        if (typeof c.posX !== "number" || typeof c.posY !== "number") {
          return false;
        }

        return true;
      })
      .map((c) => ({
        id: c.id,
        posX: c.posX as number,
        posY: c.posY as number,
        content: c.content,
        status: c.status,
        viewportWidth: c.viewportWidth,
        viewportHeight: c.viewportHeight,
        scrollY: c.scrollY,
        user: {
          name: c.authorUser?.name || c.guestAuthorName || "Client",
          avatarUrl: c.authorUser?.avatarUrl,
        },
      }));

    // If there is an active draft pin being placed, add it only if current viewport matches its creation viewport
    if (draftPin) {
      if (
        draftPin.viewportWidth === viewportSize.width &&
        draftPin.viewportHeight === viewportSize.height
      ) {
        list.push({
          id: "draft-pin",
          posX: draftPin.posX,
          posY: draftPin.posY,
          viewportWidth: draftPin.viewportWidth,
          viewportHeight: draftPin.viewportHeight,
          scrollY: draftScrollY,
          content: "New pin annotation...",
          status: "PENDING",
          user: {
            name: session?.user?.name || "You",
          },
        });
      }
    }

    return list;
  }, [comments, activePage, draftPin, draftScrollY, session, hideResolved, viewportSize.width, viewportSize.height]);

  // Click on canvas in Comment Mode -> initiate draft pin placement
  const handlePinDrop = (coords: {
    posX: number;
    posY: number;
    clientX: number;
    clientY: number;
    scrollY?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  }) => {
    if (activeMode !== "comment") return;

    setDraftPin({
      posX: coords.posX,
      posY: coords.posY,
      viewportWidth: coords.viewportWidth || viewportSize.width,
      viewportHeight: coords.viewportHeight || viewportSize.height,
    });
    setDraftScrollY(coords.scrollY || 0);
    setSelectedPinId("draft-pin");
    setIsSidebarOpen(true);
  };

  // Submit draft pin to server
  const handleSubmitDraftPin = async (content: string) => {
    if (!draftPin || !activePage) return;

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          pageId: activePage.id === "default" ? undefined : activePage.id,
          content,
          posX: Math.max(0, Math.min(100, Number(draftPin.posX.toFixed(2)))),
          posY: Math.max(0, Math.min(100, Number(draftPin.posY.toFixed(2)))),
          viewportWidth: Math.round(draftPin.viewportWidth),
          viewportHeight: Math.round(draftPin.viewportHeight),
          scrollY: Math.round(draftScrollY || 0),
        }),
      });

      if (res.ok) {
        const { comment } = await res.json();
        setComments((prev) => [...prev, comment]);
        setDraftPin(null);
        setDraftScrollY(0);
        setSelectedPinId(null);
        setPinNotification("Annotation pin placed successfully!");
        setTimeout(() => setPinNotification(null), 3000);

        // If activePage had id "default", update activePage with the resolved real page
        if (activePage.id === "default" && comment.page) {
          setActivePage(comment.page);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setPinNotification(err.error || "Failed to drop annotation pin");
        setTimeout(() => setPinNotification(null), 4000);
      }
    } catch {
      setPinNotification("Network error creating pin annotation");
      setTimeout(() => setPinNotification(null), 4000);
    }
  };

  // Cancel draft pin
  const handleCancelDraftPin = () => {
    setDraftPin(null);
    setDraftScrollY(0);
    if (selectedPinId === "draft-pin") {
      setSelectedPinId(null);
    }
  };

  // Update status (Task Progression workflow)
  const handleUpdateStatus = async (
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
        const { comment: updated } = await res.json();
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, ...updated } : c))
        );

        const toastMsg =
          newStatus === "RESOLVED"
            ? "Task marked as Resolved! ✓"
            : newStatus === "IN_PROGRESS"
            ? "Task marked In Progress (Working on it)"
            : "Task reopened";
        setPinNotification(toastMsg);
        setTimeout(() => setPinNotification(null), 3500);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Submit threaded reply
  const handleAddReply = async (commentId: string, replyContent: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });

      if (res.ok) {
        const { reply } = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, replies: [...(c.replies || []), reply] }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        if (selectedPinId === commentId) {
          setSelectedPinId(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleRefreshPages = async () => {
    if (!project?.targetUrl || isRefreshingPages) return;
    setIsRefreshingPages(true);
    try {
      const res = await fetch(`/api/projects/discover-pages?url=${encodeURIComponent(project.targetUrl)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.pages)) {
        const existingPathSet = new Set(project.pages.map((p) => p.path));
        // Filter to priority pages (CORE, SHOP, LEGAL) so preview dropdown isn't overloaded with 100+ blog articles
        let toAdd = data.pages.filter(
          (p: any) =>
            !existingPathSet.has(p.path) &&
            (p.category === "CORE" || p.category === "SHOP" || p.category === "LEGAL" || p.isDefault)
        );

        // Fallback: If no core pages found, take up to top 15 new pages
        if (toAdd.length === 0) {
          toAdd = data.pages.filter((p: any) => !existingPathSet.has(p.path)).slice(0, 15);
        }

        if (toAdd.length > 0) {
          await fetch(`/api/projects/${projectId}/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pages: toAdd.map((p: any) => ({ path: p.path, title: p.title })),
            }),
          });
          const extraArticles = data.pages.filter((p: any) => p.category === "BLOG").length;
          setPinNotification(
            `Synced ${toAdd.length} new core ${toAdd.length === 1 ? "page" : "pages"}${
              extraArticles > 0 ? ` (${extraArticles} articles available in Settings)` : ""
            }!`
          );
        } else {
          setPinNotification("All core website pages are up-to-date!");
        }
        await fetchProjectData();
        setTimeout(() => setPinNotification(null), 4000);
      }
    } catch {
      setErrorMessage("Failed to sync website pages");
      setTimeout(() => setErrorMessage(""), 3500);
    } finally {
      setIsRefreshingPages(false);
    }
  };

  // Map pages for TopBar selector
  const topBarPages = (project?.pages || [])
    .filter((p) => !p.isHidden)
    .map((p) => ({
      id: p.id,
      path: p.path,
      title: p.title,
      fullUrl: p.fullUrl,
      isDefault: p.isDefault,
      commentCount: comments.filter(
        (c) => c.pageId === p.id || c.page?.path === p.path
      ).length,
    }));

  const resolvedCount = comments.filter((c) => c.status === "RESOLVED").length;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden select-none">
      {/* Interactive Reusable TopBar */}
      <TopBar
        pages={topBarPages}
        activePageId={activePage?.id || ""}
        onPageSelect={(pageId) => {
          const selected = project?.pages.find((p) => p.id === pageId);
          if (selected) {
            setActivePage(selected);
            setDraftPin(null);
          }
        }}
        onRefreshPages={handleRefreshPages}
        isRefreshingPages={isRefreshingPages}
        projectName={project?.name}
        clientName={session?.user?.role === "DEVELOPER" ? undefined : project?.clientName}
        activeDevice={activeDevice}
        onDeviceSelect={handleSelectDevice}
        viewportSize={viewportSize}
        zoomLevel={zoomLevel}
        onZoomChange={(lvl) => setZoomLevel(lvl)}
        onResetZoom={handleResetZoomAndPan}
        activeMode={activeMode}
        onModeChange={(mode) => setActiveMode(mode)}
        commentCount={comments.length}
        resolvedCount={resolvedCount}
        hideResolved={hideResolved}
        onToggleHideResolved={() => setHideResolved((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        backHref="/admin/projects"
        onOpenShare={session?.user?.role === "ADMIN" ? () => setIsShareModalOpen(true) : undefined}
      />

      {/* Main Workspace Layout: Canvas (flex-1 min-w-0) + Smooth In-Flow Comment Sidebar */}
      <div className="relative flex flex-1 w-full min-w-0 overflow-hidden h-[calc(100vh-58px)]">
        {/* Canvas Area: Smoothly shifts and resizes when sidebar opens */}
        <main className="relative flex-1 min-w-0 h-full overflow-hidden transition-all duration-300 ease-in-out bg-slate-100/60 dot-grid">
          {errorMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive shadow-lg backdrop-blur-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {pinNotification && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-lg animate-in fade-in zoom-in-95">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{pinNotification}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-xs font-medium">Preparing preview workspace & viewports...</p>
            </div>
          ) : (
            <PreviewWindow
              url={activePage?.fullUrl || project?.targetUrl || ""}
              viewportSize={viewportSize}
              zoomLevel={zoomLevel}
              onViewportResize={(size) => {
                setViewportSize(size);
                if (selectedPinId) {
                  const sel = comments.find((c) => c.id === selectedPinId);
                  if (sel && (sel.viewportWidth !== size.width || sel.viewportHeight !== size.height)) {
                    setSelectedPinId(null);
                  }
                }
              }}
              position={panPosition}
              onPositionChange={(pos) => setPanPosition(pos)}
              isFullscreen={isFullscreen}
              activeMode={activeMode}
              annotations={previewAnnotations}
              selectedAnnotationId={selectedPinId}
              onAnnotationSelect={(id) => handleSelectComment(id)}
              onCanvasClick={handlePinDrop}
            />
          )}
        </main>

        {/* Collapsible In-Flow Comment Drawer & Threaded Discussion Sidebar */}
        <CommentSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpen={() => setIsSidebarOpen(true)}
          comments={comments}
          activePageId={activePage?.id}
          activePageTitle={activePage?.title}
          activeViewportSize={viewportSize}
          selectedCommentId={selectedPinId}
          onSelectComment={handleSelectComment}
          onAddReply={handleAddReply}
          onUpdateStatus={handleUpdateStatus}
          onDeleteComment={handleDeleteComment}
          draftPin={draftPin}
          onSubmitDraftPin={handleSubmitDraftPin}
          onCancelDraftPin={handleCancelDraftPin}
          currentUserId={session?.user?.id}
          currentUserRole={session?.user?.role}
        />
      </div>

      {/* Client Share Link Generator Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        projectId={projectId}
        projectName={project?.name || "Client Project"}
        projectClient={project?.client}
      />
    </div>
  );
}

export default function PreviewWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-col items-center justify-center bg-background text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-xs font-medium">Loading workspace...</p>
        </div>
      }
    >
      <PreviewWorkspaceContent />
    </Suspense>
  );
}
