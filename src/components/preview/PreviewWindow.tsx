"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./PreviewWindow.module.css";
import PinCanvas from "@/components/comments/PinCanvas";
import { NormalizedCoordinates } from "@/lib/canvas-math";
import { Shield, Globe, RefreshCw, AlertCircle, Sparkles, Move } from "lucide-react";

export interface ViewportSize {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface PreviewAnnotation {
  id: string;
  posX: number; // percentage (0 - 100)
  posY: number; // percentage (0 - 100)
  content: string;
  status?: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  user?: {
    name: string;
    avatarUrl?: string | null;
  };
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  scrollY?: number | null;
}

export interface PreviewWindowProps {
  url: string;
  viewportSize: ViewportSize;
  zoomLevel?: number; // -1 for Auto-Fit, or 25 to 200
  onViewportResize?: (size: ViewportSize) => void;
  position?: Position;
  onPositionChange?: (pos: Position) => void;
  isFullscreen?: boolean;
  annotations?: PreviewAnnotation[];
  selectedAnnotationId?: string | null;
  onAnnotationSelect?: (id: string | null) => void;
  activeMode?: "browse" | "comment" | "inspect";
  onCanvasClick?: (coords: NormalizedCoordinates & { clientX: number; clientY: number }) => void;
  useProxy?: boolean;
}

export default function PreviewWindow({
  url,
  viewportSize,
  zoomLevel = -1, // Defaults to Auto-Fit
  onViewportResize,
  position = { x: 0, y: 0 },
  onPositionChange,
  isFullscreen = false,
  annotations = [],
  selectedAnnotationId,
  onAnnotationSelect,
  activeMode = "browse",
  onCanvasClick,
  useProxy = true,
}: PreviewWindowProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Pan / drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });

  // Iframe loading indicator & embed mode
  const [isLoadingIframe, setIsLoadingIframe] = useState(true);
  const [useDirectEmbed, setUseDirectEmbed] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [iframeScrollY, setIframeScrollY] = useState(0);
  const [externalToast, setExternalToast] = useState<{ url: string; hostname: string } | null>(null);

  // Container dimensions via ResizeObserver
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Listen for messages from preview proxy (scroll tracking, URL changes, external link intercepts)
  useEffect(() => {
    let toastTimer: NodeJS.Timeout;
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "CREWVIA_SCROLL_UPDATE") {
        if (typeof e.data.scrollY === "number") {
          setIframeScrollY(e.data.scrollY);
        }
      } else if (e.data?.type === "CREWVIA_EXTERNAL_LINK_INTERCEPTED") {
        setExternalToast({
          url: e.data.url,
          hostname: e.data.hostname || "external website",
        });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          setExternalToast(null);
        }, 4000);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(toastTimer);
    };
  }, []);

  // Compute proxied embed URL or direct URL
  const embedUrl = useMemo(() => {
    if (!url) return "";
    if (useDirectEmbed || !useProxy) return url;
    // Already routed through proxy or internal endpoint
    if (url.startsWith("/api/preview-proxy") || url.startsWith("/api/proxy")) {
      return url;
    }
    // External HTTP/HTTPS websites routed through unframe proxy
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return `/api/preview-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, [url, useProxy, useDirectEmbed]);

  // Reset loading state whenever embedUrl changes
  useEffect(() => {
    if (embedUrl) {
      setIsLoadingIframe(true);
      setIframeError(false);
    }
  }, [embedUrl]);

  const viewportWidth = viewportSize?.width || 1440;
  const viewportHeight = viewportSize?.height || 900;

  // Calculate Auto-Fit scale so the entire frame is 100% visible inside the 100vh canvas
  const autoFitScale = useMemo(() => {
    if (!containerSize.width || !containerSize.height) return 1;
    // In normal mode: 48px padding (24px left/right, 24px top/bottom)
    // In fullscreen mode: 20px padding (10px left/right, 10px top/bottom) to maximize canvas area
    const paddingX = isFullscreen ? 20 : 48;
    const paddingY = isFullscreen ? 20 : 48;
    const availWidth = Math.max(280, containerSize.width - paddingX);
    const availHeight = Math.max(280, containerSize.height - paddingY);
    const scaleW = availWidth / (viewportWidth + 8);
    const scaleH = availHeight / (viewportHeight + 8);
    return Math.min(scaleW, scaleH, 1);
  }, [containerSize, viewportWidth, viewportHeight, isFullscreen]);

  // Effective scale: Auto-Fit if zoomLevel === -1, otherwise explicit zoom percentage
  const effectiveScale = useMemo(() => {
    if (zoomLevel === -1 || zoomLevel <= 0) {
      return autoFitScale;
    }
    return zoomLevel / 100;
  }, [zoomLevel, autoFitScale]);

  // Fail-safe release for drag & resize: guarantees cursor is never stuck
  const handleReleaseAll = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
    setIsDragging(false);
  }, []);

  // Quick reload for preview frame
  const handleReloadIframe = useCallback(() => {
    setIsLoadingIframe(true);
    setIframeError(false);
    if (iframeRef.current) {
      const sep = embedUrl.includes("?") ? "&" : "?";
      iframeRef.current.src = `${embedUrl}${sep}_t=${Date.now()}`;
    }
  }, [embedUrl]);

  // --- RESIZE HANDLERS ---
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeHandle(handle);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: viewportWidth,
        height: viewportHeight,
      });
    },
    [viewportWidth, viewportHeight]
  );

  const handleResizeMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeHandle) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      if (resizeHandle.includes("e")) newWidth = Math.max(320, resizeStart.width + deltaX / effectiveScale);
      if (resizeHandle.includes("w")) newWidth = Math.max(320, resizeStart.width - deltaX / effectiveScale);
      if (resizeHandle.includes("s")) newHeight = Math.max(400, resizeStart.height + deltaY / effectiveScale);

      if (onViewportResize) {
        onViewportResize({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      }
    },
    [isResizing, resizeHandle, resizeStart, effectiveScale, onViewportResize]
  );

  // --- DRAG / PAN HANDLERS ---
  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "IFRAME" ||
        target.closest(`.${styles.deviceScreen}`) ||
        target.closest(`.${styles.resizeHandle}`)
      ) {
        return;
      }

      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      });
    },
    [position]
  );

  const handleDragMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      if (onPositionChange) {
        onPositionChange({
          x: dragStart.posX + deltaX,
          y: dragStart.posY + deltaY,
        });
      }
    },
    [isDragging, dragStart, onPositionChange]
  );

  // Mouse wheel scroll forwarder when in Comment Mode
  const handleCanvasWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: "auto" });
      } catch {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "CREWVIA_SCROLL_BY",
            deltaY: e.deltaY,
            deltaX: e.deltaX,
          },
          "*"
        );
      }
    }
  }, []);

  // Programmatically scroll iframe to selected annotation
  useEffect(() => {
    if (!selectedAnnotationId) return;
    const target = annotations.find((a) => a.id === selectedAnnotationId);
    if (!target) return;

    const targetDocY = (target.scrollY || 0) + ((target.posY || 0) / 100) * (target.viewportHeight || viewportHeight);
    const targetScroll = Math.max(0, targetDocY - Math.round(viewportHeight / 3));

    const triggerScroll = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "CREWVIA_SCROLL_TO", scrollY: targetScroll, smooth: true },
        "*"
      );
      try {
        iframeRef.current?.contentWindow?.scrollTo({ top: targetScroll, behavior: "smooth" });
      } catch {}
    };

    // Trigger immediately
    triggerScroll();

    // Trigger again after 80ms to ensure execution after any viewport size animation or layout stabilization
    const timer = setTimeout(triggerScroll, 80);
    return () => clearTimeout(timer);
  }, [selectedAnnotationId, annotations, viewportHeight]);

  // Window listeners for smooth resize and drag with fail-safe release
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMouseMove);
      window.addEventListener("mouseup", handleReleaseAll);
      window.addEventListener("pointerup", handleReleaseAll);
      window.addEventListener("blur", handleReleaseAll);
      document.addEventListener("mouseleave", handleReleaseAll);
      return () => {
        window.removeEventListener("mousemove", handleResizeMouseMove);
        window.removeEventListener("mouseup", handleReleaseAll);
        window.removeEventListener("pointerup", handleReleaseAll);
        window.removeEventListener("blur", handleReleaseAll);
        document.removeEventListener("mouseleave", handleReleaseAll);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleReleaseAll]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMouseMove);
      window.addEventListener("mouseup", handleReleaseAll);
      window.addEventListener("pointerup", handleReleaseAll);
      window.addEventListener("blur", handleReleaseAll);
      document.addEventListener("mouseleave", handleReleaseAll);
      return () => {
        window.removeEventListener("mousemove", handleDragMouseMove);
        window.removeEventListener("mouseup", handleReleaseAll);
        window.removeEventListener("pointerup", handleReleaseAll);
        window.removeEventListener("blur", handleReleaseAll);
        document.removeEventListener("mouseleave", handleReleaseAll);
      };
    }
  }, [isDragging, handleDragMouseMove, handleReleaseAll]);

  if (!url) {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.previewPlaceholder}>
          <p className="font-semibold text-foreground">No Target URL Configured</p>
          <p className="text-xs text-muted-foreground">Please select an active project page to preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.previewContainer} ${isFullscreen ? styles.fullscreen : ""}`}
    >
      {/* Outer Scaled Layout Sizing Wrapper: Ensures browser flexbox sees the exact visual dimensions */}
      <div
        className="relative flex items-center justify-center m-auto transition-all duration-300 ease-out"
        style={{
          width: (viewportWidth + 8) * effectiveScale,
          height: (viewportHeight + 8) * effectiveScale,
        }}
      >
        {/* Device Frame */}
        <div
          ref={frameRef}
          className={`${styles.deviceFrame} ${isDragging ? styles.dragging : ""} ${
            isResizing ? styles.resizing : ""
          }`}
          style={{
            width: viewportWidth + 8,
            height: viewportHeight + 8,
            transform: `scale(${effectiveScale}) translate(${position.x / effectiveScale}px, ${position.y / effectiveScale}px)`,
            transformOrigin: "center center",
          }}
          onMouseDown={handleDragMouseDown}
        >
          {/* Inner Screen Viewport */}
          <div
            className={styles.deviceScreen}
            style={{ width: viewportWidth, height: viewportHeight }}
          >
            {/* Interactive Pin Drop Canvas Overlay */}
            <PinCanvas
              viewportWidth={viewportWidth}
              viewportHeight={viewportHeight}
              activeMode={activeMode}
              annotations={annotations}
              selectedPinId={selectedAnnotationId}
              onPinSelect={onAnnotationSelect}
              onPinDrop={onCanvasClick}
              iframeScrollY={iframeScrollY}
              onWheel={handleCanvasWheel}
            />

            {/* Sandboxed Live Website Iframe */}
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title="Live Website Preview"
              className={styles.previewIframe}
              style={{
                pointerEvents: isResizing || isDragging || activeMode === "comment" ? "none" : "auto",
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
              loading="eager"
              onLoad={() => {
                setIsLoadingIframe(false);
                setIframeError(false);
              }}
              onError={() => {
                setIsLoadingIframe(false);
                setIframeError(true);
              }}
            />

            {/* Error Fallback Overlay */}
            {iframeError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/95 backdrop-blur-md p-6 text-center">
                <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2.5 border border-rose-200">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Preview Connection Interrupted</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                  Unable to render preview frame directly. Click retry to refresh the proxy gateway.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIframeError(false);
                    setIsLoadingIframe(true);
                    if (iframeRef.current) {
                      const separator = embedUrl.includes("?") ? "&" : "?";
                      iframeRef.current.src = `${embedUrl}${separator}_t=${Date.now()}`;
                    }
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoadingIframe && !iframeError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/85 backdrop-blur-sm pointer-events-none transition-opacity duration-300">
                <div className="flex items-center gap-2.5 rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-semibold text-foreground shadow-xl backdrop-blur-md">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Loading live preview...</span>
                </div>
              </div>
            )}
          </div>

          {/* Resizing Handles */}
          <div
            className={`${styles.resizeHandle} ${styles.resizeHandleE}`}
            onMouseDown={(e) => handleResizeMouseDown(e, "e")}
            title="Drag to resize width"
          />
          <div
            className={`${styles.resizeHandle} ${styles.resizeHandleW}`}
            onMouseDown={(e) => handleResizeMouseDown(e, "w")}
            title="Drag to resize width"
          />
          <div
            className={`${styles.resizeHandle} ${styles.resizeHandleS}`}
            onMouseDown={(e) => handleResizeMouseDown(e, "s")}
            title="Drag to resize height"
          />
          <div
            className={`${styles.resizeHandle} ${styles.resizeHandleSE}`}
            onMouseDown={(e) => handleResizeMouseDown(e, "se")}
            title="Drag to resize both dimensions"
          />
          <div
            className={`${styles.resizeHandle} ${styles.resizeHandleSW}`}
            onMouseDown={(e) => handleResizeMouseDown(e, "sw")}
            title="Drag to resize both dimensions"
          />

          {/* Dimension Indicator Badge */}
          <div className={styles.sizeIndicator}>
            <span>{viewportWidth} × {viewportHeight} px</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{Math.round(effectiveScale * 100)}%</span>
            {useDirectEmbed ? (
              <span className="ml-1 text-[10px] text-blue-600 font-semibold">(Direct Embed)</span>
            ) : (
              <span className="ml-1 text-[10px] text-emerald-600 font-semibold">(Unframed)</span>
            )}
            <button
              type="button"
              onClick={handleReloadIframe}
              className="ml-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Reload preview frame"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* External Link Intercept Notification */}
      {externalToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <Globe className="h-4 w-4 text-sky-600 shrink-0" />
          <span>External link ({externalToast.hostname}) opened in a new tab. Preview preserved.</span>
        </div>
      )}

      {/* Global Transparent Blocker Overlay during active resizing or canvas drag */}
      {(isResizing || isDragging) && (
        <div
          className="fixed inset-0 z-[99999] select-none"
          style={{
            cursor: isResizing
              ? (resizeHandle?.includes("e") || resizeHandle?.includes("w")
                  ? "ew-resize"
                  : resizeHandle?.includes("s")
                  ? "ns-resize"
                  : "nwse-resize")
              : "grabbing",
          }}
          onMouseUp={handleReleaseAll}
          onPointerUp={handleReleaseAll}
        />
      )}
    </div>
  );
}
