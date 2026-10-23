"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  MessageSquare,
  Eye,
  ShieldAlert,
  Loader2,
  Lock,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Info
} from "lucide-react";
import PreviewWindow, { ViewportSize, Position, PreviewAnnotation } from "@/components/preview/PreviewWindow";
import CommentSidebar, { DraftPinData } from "@/components/comments/CommentSidebar";
import { CommentItem } from "@/components/comments/CommentCard";
import GuestIdentityModal, { GuestIdentity } from "@/components/comments/GuestIdentityModal";
import TopBar, { PageOption } from "@/components/layout/TopBar";
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
  displayOrder: number;
}

interface SharedProjectData {
  id: string;
  name: string;
  clientName: string;
  targetUrl: string;
  status: string;
}

function SharedPreviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;

  const urlName = searchParams.get("name") || searchParams.get("clientName");
  const urlEmail = searchParams.get("email");

  const [project, setProject] = useState<SharedProjectData | null>(null);
  const [pages, setPages] = useState<ProjectPageItem[]>([]);
  const [activePage, setActivePage] = useState<ProjectPageItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [accessLevel, setAccessLevel] = useState<"VIEWER" | "COMMENTER">("VIEWER");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState("");

  // Canvas interaction state
  const [activeDevice, setActiveDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [viewportSize, setViewportSize] = useState<ViewportSize>(DEVICE_PRESETS.desktop);
  const [zoomLevel, setZoomLevel] = useState<number>(-1); // Auto-Fit
  const [panPosition, setPanPosition] = useState<Position>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeMode, setActiveMode] = useState<"browse" | "comment">("browse");

  // Annotations & Sidebar state
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [draftPin, setDraftPin] = useState<DraftPinData | null>(null);
  const [draftScrollY, setDraftScrollY] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [hideResolved, setHideResolved] = useState(false);

  // Guest Identity Modal state & client own comments
  const [guestIdentity, setGuestIdentity] = useState<GuestIdentity | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [pendingDraftContent, setPendingDraftContent] = useState<string | null>(null);
  const [pendingReply, setPendingReply] = useState<{ commentId: string; content: string } | null>(null);
  const [ownCommentIds, setOwnCommentIds] = useState<string[]>([]);

  // Retrieve saved client identity from URL (email link), localStorage, or cookies
  useEffect(() => {
    try {
      // 1. If reviewer identity was attached to the invite URL (e.g. from invitation email)
      if (urlName && urlName.trim()) {
        const autoIdentity: GuestIdentity = {
          name: urlName.trim(),
          email: urlEmail ? urlEmail.trim() : "",
        };
        setGuestIdentity(autoIdentity);
        localStorage.setItem("vanguard_guest_identity", JSON.stringify(autoIdentity));
        document.cookie = `vanguard_reviewer_name=${encodeURIComponent(autoIdentity.name)}; path=/; max-age=2592000; SameSite=Lax`;
      } else {
        // 2. Check localStorage (with legacy fallback)
        const saved = localStorage.getItem("vanguard_guest_identity") || localStorage.getItem("reno_guest_identity");
        let found = false;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name && parsed.name.trim()) {
            setGuestIdentity(parsed);
            found = true;
          }
        }

        // 3. Fallback: check cookie vanguard_reviewer_name (or legacy reno_reviewer_name)
        if (!found) {
          const match = document.cookie.match(/(?:^|;\s*)(?:vanguard_reviewer_name|reno_reviewer_name)=([^;]+)/);
          if (match && match[1]) {
            const decoded = decodeURIComponent(match[1]).trim();
            if (decoded) {
              const identityFromCookie: GuestIdentity = { name: decoded, email: "" };
              setGuestIdentity(identityFromCookie);
              localStorage.setItem("vanguard_guest_identity", JSON.stringify(identityFromCookie));
            }
          }
        }
      }

      const savedOwn = localStorage.getItem(`vanguard_own_comments_${token}`) || localStorage.getItem(`reno_own_comments_${token}`);
      if (savedOwn) {
        setOwnCommentIds(JSON.parse(savedOwn));
      }
    } catch {}
  }, [token, urlName, urlEmail]);

  // Fetch share preview data
  const fetchShareData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setErrorCode("");
    try {
      const res = await fetch(`/api/share/${token}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setPages(data.pages || []);
        setComments(data.comments || []);
        setAccessLevel(data.accessLevel || "VIEWER");
        setExpiresAt(data.expiresAt || null);

        // Pick default page
        const defaultPage =
          data.pages.find((p: ProjectPageItem) => p.isDefault) ||
          data.pages[0] || {
            id: "default",
            path: "/",
            fullUrl: data.project.targetUrl,
            title: "Home",
            isDefault: true,
            displayOrder: 0,
          };
        setActivePage(defaultPage);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to load client preview");
        setErrorCode(err.code || "ERROR");
      }
    } catch {
      setErrorMessage("Network error connecting to client preview service");
      setErrorCode("NETWORK_ERROR");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchShareData();
    }
  }, [token, fetchShareData]);

  // Viewport snapping
  const handleSelectDevice = (device: "desktop" | "tablet" | "mobile") => {
    setActiveDevice(device);
    const newSize = DEVICE_PRESETS[device];
    setViewportSize(newSize);
    setPanPosition({ x: 0, y: 0 });
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

  // Keyboard shortcuts
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
        if (accessLevel === "COMMENTER") {
          setActiveMode("comment");
        }
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
  }, [accessLevel]);

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
        const matchingPage = pages.find((p) => p.id === target.pageId);
        if (matchingPage) {
          setActivePage(matchingPage);
        }
      }
    },
    [comments, activePage, pages]
  );

  // Filtered annotations for active page with strict screen size matching
  const previewAnnotations: PreviewAnnotation[] = useMemo(() => {
    const list: PreviewAnnotation[] = comments
      .filter((c) => {
        if (hideResolved && c.status === "RESOLVED") return false;
        if (!activePage) return true;
        if (c.pageId && c.pageId !== activePage.id && c.page?.path !== activePage.path) return false;

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
            name: "You",
          },
        });
      }
    }

    return list;
  }, [comments, activePage, draftPin, draftScrollY, hideResolved, viewportSize.width, viewportSize.height]);

  // Canvas click handler (Commenter only)
  const handlePinDrop = (coords: {
    posX: number;
    posY: number;
    clientX: number;
    clientY: number;
    scrollY?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  }) => {
    if (accessLevel !== "COMMENTER") {
      setNotification("This preview link is in Read-Only mode. Commenting is disabled.");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

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

  // Submit client comment to backend API
  const submitClientComment = async (content: string, identity: GuestIdentity) => {
    if (!draftPin || !activePage) return;

    try {
      const res = await fetch(`/api/share/${token}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: activePage.id === "default" ? undefined : activePage.id,
          content,
          posX: Math.max(0, Math.min(100, Number(draftPin.posX.toFixed(2)))),
          posY: Math.max(0, Math.min(100, Number(draftPin.posY.toFixed(2)))),
          viewportWidth: Math.round(draftPin.viewportWidth),
          viewportHeight: Math.round(draftPin.viewportHeight),
          scrollY: Math.round(draftScrollY || 0),
          guestAuthorName: identity.name,
          guestAuthorEmail: identity.email || "",
        }),
      });

      if (res.ok) {
        const { comment } = await res.json();
        setComments((prev) => [...prev, comment]);
        setDraftPin(null);
        setDraftScrollY(0);
        setSelectedPinId(null);
        setOwnCommentIds((prev) => {
          const updated = [...prev, comment.id];
          try {
            localStorage.setItem(`vanguard_own_comments_${token}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setNotification(`Feedback submitted as ${identity.name}! ✓`);
        setTimeout(() => setNotification(null), 3500);

        if (activePage.id === "default" && comment.page) {
          setActivePage(comment.page);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setNotification(err.error || "Failed to submit feedback");
        setTimeout(() => setNotification(null), 4000);
      }
    } catch {
      setNotification("Network error submitting feedback");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Delete client's own comment
  const handleDeleteComment = async (commentId: string) => {
    if (accessLevel !== "COMMENTER") {
      alert("Read-only access. Comment deletion is disabled.");
      return;
    }

    try {
      const authorQuery = guestIdentity?.name
        ? `&guestAuthorName=${encodeURIComponent(guestIdentity.name)}`
        : "";
      const res = await fetch(`/api/share/${token}/comment?commentId=${commentId}${authorQuery}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setOwnCommentIds((prev) => {
          const updated = prev.filter((id) => id !== commentId);
          try {
            localStorage.setItem(`vanguard_own_comments_${token}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        if (selectedPinId === commentId) {
          setSelectedPinId(null);
        }
        setNotification("Your comment was deleted successfully.");
        setTimeout(() => setNotification(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete comment");
      }
    } catch {
      alert("Network error deleting comment");
    }
  };

  // Submit client reply to backend API
  const submitClientReply = async (commentId: string, content: string, identity: GuestIdentity) => {
    try {
      const res = await fetch(`/api/share/${token}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId,
          content,
          guestAuthorName: identity.name,
          guestAuthorEmail: identity.email || "",
        }),
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
        setNotification(`Reply submitted as ${identity.name}! ✓`);
        setTimeout(() => setNotification(null), 3500);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit reply");
      }
    } catch {
      alert("Network error submitting reply");
    }
  };

  const handleIdentitySubmit = (identity: GuestIdentity) => {
    setGuestIdentity(identity);
    try {
      localStorage.setItem("vanguard_guest_identity", JSON.stringify(identity));
      document.cookie = `vanguard_reviewer_name=${encodeURIComponent(identity.name)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {}

    if (pendingDraftContent) {
      submitClientComment(pendingDraftContent, identity);
      setPendingDraftContent(null);
    } else if (pendingReply) {
      submitClientReply(pendingReply.commentId, pendingReply.content, identity);
      setPendingReply(null);
    }
  };

  const resolvedCount = comments.filter((c) => c.status === "RESOLVED").length;
  const progressPercent = comments.length > 0 ? Math.round((resolvedCount / comments.length) * 100) : 0;

  // Pages mapped for unified TopBar selector
  const topBarPages: PageOption[] = pages.map((p) => ({
    id: p.id,
    path: p.path,
    title: p.title,
    fullUrl: p.fullUrl,
    isDefault: p.isDefault,
    commentCount: comments.filter(
      (c) => c.pageId === p.id || c.page?.path === p.path
    ).length,
  }));

  // Role badge indicator (Commenter vs Viewer)
  const roleBadge = (
    <div className="flex items-center">
      {accessLevel === "COMMENTER" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-semibold">
          <Sparkles className="h-3 w-3 text-emerald-600" />
          <span>Commenter</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 text-[10px] font-semibold">
          <Eye className="h-3 w-3 text-blue-600" />
          <span>Viewer</span>
        </span>
      )}
    </div>
  );

  // Scoped modes: Viewer has Browse only; Commenter has Browse + Comment; Inspect is never shown to client
  const allowedModes: ("browse" | "comment" | "inspect")[] =
    accessLevel === "COMMENTER" ? ["browse", "comment"] : ["browse"];

  // --- ACCESS DENIED / EXPIRED VIEW ---
  if (!isLoading && errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background ambient-canvas dot-grid">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
            {errorCode === "EXPIRED" ? <Lock className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-2">
            {errorCode === "EXPIRED" ? "Preview Link Expired" : "Access Restricted"}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            {errorMessage}
          </p>
          <div className="rounded-xl border border-border/80 bg-secondary/50 p-4 text-[11px] text-muted-foreground text-left">
            <p className="font-semibold text-foreground mb-1">Need access?</p>
            <p>
              Please reach out to your agency account manager to request an updated or extended preview link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden select-none">
      {/* Unified Interactive TopBar matching Admin Preview placement & UI */}
      <TopBar
        pages={topBarPages}
        activePageId={activePage?.id || ""}
        onPageSelect={(pageId) => {
          const sel = pages.find((p) => p.id === pageId);
          if (sel) {
            setActivePage(sel);
            setDraftPin(null);
          }
        }}
        projectName={project?.name}
        clientName={project?.clientName}
        roleBadge={roleBadge}
        activeDevice={activeDevice}
        onDeviceSelect={handleSelectDevice}
        viewportSize={viewportSize}
        zoomLevel={zoomLevel}
        onZoomChange={(lvl) => setZoomLevel(lvl)}
        onResetZoom={handleResetZoomAndPan}
        activeMode={activeMode}
        onModeChange={(mode) => setActiveMode(mode as "browse" | "comment")}
        allowedModes={allowedModes}
        commentCount={comments.length}
        resolvedCount={resolvedCount}
        hideResolved={hideResolved}
        onToggleHideResolved={() => setHideResolved((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        showNotifications={false}
      />

      {/* Main Workspace Layout: Canvas (flex-1) + Smooth In-Flow Comment Sidebar */}
      <div className="relative flex flex-1 overflow-hidden h-[calc(100vh-58px)]">
        {/* Main Preview Area */}
        <main className="relative flex-1 h-full overflow-hidden transition-all duration-300 ease-in-out bg-slate-100/60 dot-grid">
          {/* Notification Toast */}
          {notification && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-lg animate-in fade-in zoom-in-95">
              <Info className="h-3.5 w-3.5 text-emerald-600" />
              <span>{notification}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-xs font-medium">Connecting to client preview workspace...</p>
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

        {/* Comment Drawer (In-Flow Push Sidebar) */}
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
          onAddReply={async (commentId, content) => {
            if (accessLevel !== "COMMENTER") {
              alert("This link is read-only. Commenting is disabled.");
              return;
            }
            if (!guestIdentity?.name) {
              setPendingReply({ commentId, content });
              setIsIdentityModalOpen(true);
            } else {
              await submitClientReply(commentId, content, guestIdentity);
            }
          }}
          onUpdateStatus={async () => {
            alert("Only assigned agency team members can mark tasks as resolved.");
          }}
          onDeleteComment={handleDeleteComment}
          draftPin={accessLevel === "COMMENTER" ? draftPin : null}
          onSubmitDraftPin={async (content) => {
            if (accessLevel !== "COMMENTER") return;
            if (!guestIdentity?.name) {
              setPendingDraftContent(content);
              setIsIdentityModalOpen(true);
            } else {
              await submitClientComment(content, guestIdentity);
            }
          }}
          onCancelDraftPin={() => setDraftPin(null)}
          currentUserRole="CLIENT"
          clientOwnCommentIds={ownCommentIds}
          currentGuestName={guestIdentity?.name}
        />
      </div>

      {/* Guest Identity Modal for First-Time Reviewers */}
      <GuestIdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => {
          setIsIdentityModalOpen(false);
          setPendingDraftContent(null);
          setPendingReply(null);
        }}
        onSubmit={handleIdentitySubmit}
        initialName={guestIdentity?.name || project?.clientName || ""}
        initialEmail={guestIdentity?.email || ""}
      />
    </div>
  );
}

export default function ClientSharedPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        </div>
      }
    >
      <SharedPreviewPageContent />
    </Suspense>
  );
}
