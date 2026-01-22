import React, { useState, useMemo, useEffect, useCallback } from 'react';
import PreviewWindow from './components/PreviewWindow';
import Layout from './components/layout/Layout';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import rawData from './data.json';
import './App.css';

// Predefined device sizes for toolbar icons
const DEVICE_PRESETS = {
  desktop: { width: 1440, height: 900, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 667, label: 'Mobile' }
};

function App() {
  const allAnnotations = useMemo(() => Array.isArray(rawData) ? rawData : [rawData], []);
  
  // Extract unique pages - Fixed: ensure proper path handling for "/"
  const uniquePages = useMemo(() => {
    const pagesMap = new Map();
    allAnnotations.forEach(ann => {
        if (!ann.page) return;
        const path = ann.page.path || '/';
        if (!pagesMap.has(path)) {
            pagesMap.set(path, {
                path: path,
                fullUrl: ann.page.fullUrl,
                count: 0
            });
        }
        pagesMap.get(path).count++;
    });
    return Array.from(pagesMap.values());
  }, [allAnnotations]);

  // --- STATE ---
  const [activePagePath, setActivePagePath] = useState(uniquePages.length > 0 ? uniquePages[0].path : '');
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [activeViewport, setActiveViewport] = useState(DEVICE_PRESETS.mobile);
  const [activeDevice, setActiveDevice] = useState('mobile');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMode, setActiveMode] = useState('browse');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 });

  // --- DERIVED DATA ---
  
  const pageComments = useMemo(() => {
    return allAnnotations.filter(ann => {
      const annPath = ann.page?.path || '/';
      return annPath === activePagePath;
    });
  }, [allAnnotations, activePagePath]);

  const pageViewports = useMemo(() => {
      const vps = new Map();
      pageComments.forEach(ann => {
          const w = ann.position?.viewportWidth || 375;
          const h = ann.position?.viewportHeight || 667;
          const key = `${w}x${h}`;
          if (!vps.has(key)) {
              vps.set(key, { width: w, height: h });
          }
      });
      return Array.from(vps.values());
  }, [pageComments]);

  const previewComments = useMemo(() => {
      return pageComments.filter(ann => {
          const w = ann.position?.viewportWidth || 375;
          const h = ann.position?.viewportHeight || 667;
          return w === activeViewport.width && h === activeViewport.height;
      });
  }, [pageComments, activeViewport]);

  // --- EFFECTS ---

  useEffect(() => {
      if (pageViewports.length > 0) {
          const exists = pageViewports.find(vp => vp.width === activeViewport.width && vp.height === activeViewport.height);
          if (!exists) {
              setActiveViewport(pageViewports[0]);
          }
      }
  }, [activePagePath, pageViewports]);

  // Keyboard shortcuts for zoom and fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoomLevel(prev => Math.min(prev + 10, 200));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoomLevel(prev => Math.max(prev - 10, 25));
        } else if (e.key === '0') {
          e.preventDefault();
          setZoomLevel(100);
        }
      }
      // ESC to exit fullscreen
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // --- HANDLERS ---

  const handlePageSelect = (path) => {
    const normalizedPath = path || '/';
    setActivePagePath(normalizedPath);
    setSelectedCommentId(null);
  };

  const handleCommentSelect = (id) => {
      setSelectedCommentId(id);
      
      const comment = pageComments.find(c => c.id === id);
      if (comment) {
          const w = comment.position?.viewportWidth || 375;
          const h = comment.position?.viewportHeight || 667;
          if (w !== activeViewport.width || h !== activeViewport.height) {
              setActiveViewport({ width: w, height: h });
          }
      }
  };

  const handleViewportSelect = (vp) => {
      setActiveViewport(vp);
  };

  const handleDeviceSelect = useCallback((deviceKey) => {
    setActiveDevice(deviceKey);
    setActiveViewport(DEVICE_PRESETS[deviceKey]);
  }, []);

  const handleZoomChange = useCallback((newZoom) => {
    setZoomLevel(Math.max(25, Math.min(200, newZoom)));
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleModeChange = useCallback((mode) => {
    setActiveMode(mode);
  }, []);

  const handleViewportResize = useCallback((newSize) => {
    setActiveViewport(newSize);
    setActiveDevice(null);
  }, []);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Reset position when exiting fullscreen
    if (isFullscreen) {
      setViewportPosition({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

  const handleViewportMove = useCallback((newPosition) => {
    setViewportPosition(newPosition);
  }, []);

  const activePageObj = uniquePages.find(p => p.path === activePagePath);
  
  // In development, use the Vite proxy to avoid CORS/X-Frame-Options issues
  // In production, use the Vercel API proxy (/api/proxy)
  const isDev = import.meta.env.DEV;
  
  let proxyUrl = '';
  if (activePageObj) {
    // Get just the path from the fullUrl
    const urlPath = activePageObj.path || '/';
    
    if (isDev) {
      // Development: use Vite proxy
      proxyUrl = `/proxy-target${urlPath}`;
    } else {
      // Production: use Vercel serverless API proxy
      proxyUrl = `/api/proxy?path=${encodeURIComponent(urlPath)}`;
    }
  }

  // Fullscreen mode - render only viewport
  if (isFullscreen) {
    return (
      <div className="fullscreen-container">
        <button 
          className="exit-fullscreen-btn"
          onClick={handleFullscreenToggle}
          title="Exit Fullscreen (ESC)"
        >
          ✕
        </button>
        <PreviewWindow 
          url={proxyUrl} 
          annotations={previewComments}
          selectedId={selectedCommentId}
          viewportSize={activeViewport}
          zoomLevel={zoomLevel}
          onViewportResize={handleViewportResize}
          isFullscreen={true}
          position={viewportPosition}
          onPositionChange={handleViewportMove}
        />
      </div>
    );
  }

  return (
    <Layout
      sidebarVisible={sidebarOpen}
      topBar={
        <TopBar 
            pages={uniquePages} 
            activePage={activePagePath} 
            onPageSelect={handlePageSelect}
            viewports={pageViewports}
            activeViewport={activeViewport}
            onViewportSelect={handleViewportSelect}
            activeDevice={activeDevice}
            onDeviceSelect={handleDeviceSelect}
            zoomLevel={zoomLevel}
            onZoomChange={handleZoomChange}
            sidebarOpen={sidebarOpen}
            onSidebarToggle={handleSidebarToggle}
            commentCount={pageComments.length}
            activeMode={activeMode}
            onModeChange={handleModeChange}
            onFullscreenToggle={handleFullscreenToggle}
        />
      }
      sidebar={
        <Sidebar 
            comments={pageComments}
            onCommentSelect={handleCommentSelect} 
        />
      }
    >
      <PreviewWindow 
        url={proxyUrl} 
        annotations={previewComments}
        selectedId={selectedCommentId}
        viewportSize={activeViewport}
        zoomLevel={zoomLevel}
        onViewportResize={handleViewportResize}
        position={viewportPosition}
        onPositionChange={handleViewportMove}
      />
    </Layout>
  );
}

export default App;
