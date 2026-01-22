import React, { useState, useEffect, useRef, useCallback } from 'react';
import AnnotationMarker from './AnnotationMarker';
import './PreviewWindow.css';

const PreviewWindow = ({ 
  url, 
  annotations = [], 
  selectedId, 
  viewportSize, 
  zoomLevel = 100, 
  onViewportResize,
  isFullscreen = false,
  position = { x: 0, y: 0 },
  onPositionChange
}) => {
  if (!url) return <div className="preview-placeholder">Enter a URL to preview</div>;

  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  
  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  // Drag/move state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });

  const viewportWidth = viewportSize?.width || 375;
  const viewportHeight = viewportSize?.height || 667;
  const scale = zoomLevel / 100;

  // Handle iframe scroll
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
        try {
            if (iframe.contentWindow) {
                const win = iframe.contentWindow;
                setScrollY(win.scrollY);
                
                const onScroll = () => setScrollY(win.scrollY);
                win.addEventListener('scroll', onScroll);
                return () => win.removeEventListener('scroll', onScroll);
            }
        } catch (e) {
            console.warn("Cross-origin access blocked", e);
        }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [url]);

  // Scroll to selected comment
  useEffect(() => {
    if (selectedId && iframeRef.current?.contentWindow) {
      const selected = annotations.find(a => a.id === selectedId);
      if (selected?.position) {
         try {
             const targetY = selected.position.y - (viewportHeight / 3); 
             iframeRef.current.contentWindow.scrollTo({
                 top: targetY,
                 behavior: 'smooth'
             });
         } catch (e) {
             console.warn("Cannot scroll iframe", e);
         }
      }
    }
  }, [selectedId, annotations, viewportHeight]);

  // --- RESIZE HANDLERS ---
  const handleResizeMouseDown = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: viewportWidth,
      height: viewportHeight
    });
  }, [viewportWidth, viewportHeight]);

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing || !resizeHandle) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;

    if (resizeHandle.includes('e')) newWidth = Math.max(320, resizeStart.width + deltaX / scale);
    if (resizeHandle.includes('w')) newWidth = Math.max(320, resizeStart.width - deltaX / scale);
    if (resizeHandle.includes('s')) newHeight = Math.max(400, resizeStart.height + deltaY / scale);
    if (resizeHandle.includes('n')) newHeight = Math.max(400, resizeStart.height - deltaY / scale);

    if (onViewportResize) {
      onViewportResize({
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    }
  }, [isResizing, resizeHandle, resizeStart, scale, onViewportResize]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // --- DRAG/MOVE HANDLERS ---
  const handleDragMouseDown = useCallback((e) => {
    // Only allow dragging from the bezel (not the screen itself)
    if (e.target.classList.contains('preview-iframe') || 
        e.target.classList.contains('device-screen') ||
        e.target.classList.contains('annotation-layer')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    });
  }, [position]);

  const handleDragMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (onPositionChange) {
      onPositionChange({
        x: dragStart.posX + deltaX,
        y: dragStart.posY + deltaY
      });
    }
  }, [isDragging, dragStart, onPositionChange]);

  const handleDragMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMouseMove);
      window.addEventListener('mouseup', handleResizeMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleResizeMouseMove);
        window.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMouseMove);
      window.addEventListener('mouseup', handleDragMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleDragMouseMove);
        window.removeEventListener('mouseup', handleDragMouseUp);
      };
    }
  }, [isDragging, handleDragMouseMove, handleDragMouseUp]);

  return (
    <div className={`preview-container ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div 
        ref={frameRef}
        className={`device-frame ${isDragging ? 'dragging' : ''}`}
        style={{ 
          width: viewportWidth + 4, // Very thin bezel (2px each side)
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transformOrigin: 'center center',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleDragMouseDown}
      >
         <div className="device-screen" style={{ width: viewportWidth, height: viewportHeight }}>
            {/* Annotation Layer */}
            <div className="annotation-layer">
               {annotations.map((ann) => {
                 const pos = ann.position || { x: 0, y: 0 };
                 const topPos = pos.y - scrollY;
                 const isSelected = selectedId === ann.id;
                 const leftPos = `${pos.x}%`;

                 return (
                   <div 
                        key={ann.id} 
                        className={isSelected ? "marker-wrapper selected" : "marker-wrapper"}
                        style={{
                            position: 'absolute',
                            left: leftPos,
                            top: topPos,
                            zIndex: isSelected ? 200 : 10
                        }}
                   >
                       <AnnotationMarker 
                         position={{x:0, y:0}} 
                         content={ann.content} 
                         user={ann.user} 
                         isActive={isSelected}
                       />
                   </div>
                 );
               })}
            </div>

            <iframe 
              ref={iframeRef}
              src={url} 
              title="Website Preview"
              className="preview-iframe"
              width="100%"
              height="100%"
            />
         </div>

         {/* Resize Handles - very subtle */}
         <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleResizeMouseDown(e, 'e')} />
         <div className="resize-handle resize-handle-w" onMouseDown={(e) => handleResizeMouseDown(e, 'w')} />
         <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleResizeMouseDown(e, 's')} />
         <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
         <div className="resize-handle resize-handle-sw" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
         
         {/* Size indicator */}
         <div className="size-indicator">
            {viewportWidth} × {viewportHeight}
         </div>
      </div>
    </div>
  );
};

export default PreviewWindow;
