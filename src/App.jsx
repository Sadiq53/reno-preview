import React, { useState, useMemo, useEffect } from 'react';
import PreviewWindow from './components/PreviewWindow';
import Layout from './components/layout/Layout';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import rawData from './data.json';
import './App.css';

function App() {
  const allAnnotations = useMemo(() => Array.isArray(rawData) ? rawData : [rawData], []);
  
  // Extract unique pages
  const uniquePages = useMemo(() => {
    const pagesMap = new Map();
    allAnnotations.forEach(ann => {
        if (!ann.page) return;
        const path = ann.page.path;
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
  const [activeViewport, setActiveViewport] = useState({ width: 375, height: 667 });

  // --- DERIVED DATA ---
  
  // 1. All comments for current page (for Sidebar)
  const pageComments = useMemo(() => {
    return allAnnotations.filter(ann => ann.page?.path === activePagePath);
  }, [allAnnotations, activePagePath]);

  // 2. Available viewports for current page
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

  // 3. Filtered comments for Preview (matching active viewport)
  const previewComments = useMemo(() => {
      return pageComments.filter(ann => {
          const w = ann.position?.viewportWidth || 375;
          const h = ann.position?.viewportHeight || 667;
          return w === activeViewport.width && h === activeViewport.height;
      });
  }, [pageComments, activeViewport]);

  // --- EFFECTS ---

  // When page changes, reset viewport to the first available one for that page
  useEffect(() => {
      if (pageViewports.length > 0) {
          // Check if current active viewport exists in new page viewports
          const exists = pageViewports.find(vp => vp.width === activeViewport.width && vp.height === activeViewport.height);
          if (!exists) {
              setActiveViewport(pageViewports[0]);
          }
      }
  }, [activePagePath, pageViewports]);

  // --- HANDLERS ---

  const handlePageSelect = (path) => {
    setActivePagePath(path);
    setSelectedCommentId(null);
  };

  const handleCommentSelect = (id) => {
      setSelectedCommentId(id);
      
      // If the selected comment has a different viewport, switch to it!
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

  const activePageObj = uniquePages.find(p => p.path === activePagePath);
  
  const proxyUrl = activePageObj 
    ? activePageObj.fullUrl.replace('https://reno-v1.webflow.io', '/proxy-target')
    : '';

  return (
    <Layout
      topBar={
        <TopBar 
            pages={uniquePages} 
            activePage={activePagePath} 
            onPageSelect={handlePageSelect}
            viewports={pageViewports}
            activeViewport={activeViewport}
            onViewportSelect={handleViewportSelect}
        />
      }
      sidebar={
        <Sidebar 
            comments={pageComments} // Show ALL comments for page
            onCommentSelect={handleCommentSelect} 
        />
      }
    >
      <PreviewWindow 
        url={proxyUrl} 
        annotations={previewComments} // Show ONLY viewport comments
        selectedId={selectedCommentId}
        viewportSize={activeViewport} // Explicitly pass size
      />
    </Layout>
  );
}

export default App;
