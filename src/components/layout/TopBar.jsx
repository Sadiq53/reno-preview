import React from 'react';
import './TopBar.css';

// SVG Icons as components
const DesktopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/>
  </svg>
);

const TabletIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M18.5 0h-14C3.12 0 2 1.12 2 2.5v19C2 22.88 3.12 24 4.5 24h14c1.38 0 2.5-1.12 2.5-2.5v-19C21 1.12 19.88 0 18.5 0zm-7 23c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7.5-4H4V3h15v16z"/>
  </svg>
);

const MobileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z"/>
  </svg>
);

const CommentIcon = ({ count }) => (
  <div className="comment-icon-wrapper">
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
    </svg>
    {count > 0 && <span className="comment-badge">{count}</span>}
  </div>
);

const ZoomInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/>
  </svg>
);

const ZoomOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/>
  </svg>
);

const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
);

const TopBar = ({ 
  pages, 
  activePage, 
  onPageSelect, 
  viewports, 
  activeViewport, 
  onViewportSelect,
  activeDevice,
  onDeviceSelect,
  zoomLevel,
  onZoomChange,
  sidebarOpen,
  onSidebarToggle,
  commentCount,
  activeMode,
  onModeChange,
  onFullscreenToggle
}) => {
  return (
    <div className="topbar-container">
      {/* Left Section - Brand & Page Controls */}
      <div className="topbar-left">
        <button className="icon-btn menu-btn">
          <MenuIcon />
        </button>
        
        <div className="brand">
          <span className="logo-text">Reno</span>
        </div>
        
        <div className="selector-group page-selector">
          <select 
            value={activePage} 
            onChange={(e) => onPageSelect(e.target.value)}
            className="dropdown"
          >
            {pages.map(page => (
              <option key={page.path} value={page.path}>
                {page.path === '/' ? '/ (Home)' : page.path} ({page.count})
              </option>
            ))}
          </select>
        </div>

        {viewports && viewports.length > 0 && (
          <div className="selector-group viewport-selector">
            <select 
              value={JSON.stringify(activeViewport)} 
              onChange={(e) => onViewportSelect(JSON.parse(e.target.value))}
              className="dropdown"
            >
              {viewports.map((vp, index) => (
                <option key={index} value={JSON.stringify(vp)}>
                  {vp.width} x {vp.height}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Icon buttons group */}
        <div className="icon-group">
          <button className="icon-btn" title="Comment" onClick={onSidebarToggle}>
            <CommentIcon count={commentCount} />
          </button>
        </div>
      </div>

      {/* Center Section - Mode Toggle */}
      <div className="topbar-center">
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${activeMode === 'browse' ? 'active' : ''}`}
            onClick={() => onModeChange('browse')}
          >
            Browse <span className="shortcut">(B)</span>
          </button>
          <button 
            className={`mode-btn ${activeMode === 'comment' ? 'active' : ''}`}
            onClick={() => onModeChange('comment')}
          >
            Comment <span className="shortcut">(C)</span>
          </button>
          <button 
            className={`mode-btn ${activeMode === 'inspect' ? 'active' : ''}`}
            onClick={() => onModeChange('inspect')}
          >
            Inspect <span className="shortcut">(I)</span>
          </button>
        </div>
      </div>

      {/* Right Section - Device & Zoom Controls */}
      <div className="topbar-right">
        {/* Device Size Icons */}
        <div className="device-icons">
          <button 
            className={`icon-btn device-btn ${activeDevice === 'desktop' ? 'active' : ''}`}
            onClick={() => onDeviceSelect('desktop')}
            title="Desktop (1440x900)"
          >
            <DesktopIcon />
          </button>
          <button 
            className={`icon-btn device-btn ${activeDevice === 'tablet' ? 'active' : ''}`}
            onClick={() => onDeviceSelect('tablet')}
            title="Tablet (768x1024)"
          >
            <TabletIcon />
          </button>
          <button 
            className={`icon-btn device-btn ${activeDevice === 'mobile' ? 'active' : ''}`}
            onClick={() => onDeviceSelect('mobile')}
            title="Mobile (375x667)"
          >
            <MobileIcon />
          </button>
        </div>

        <div className="separator"></div>

        {/* Additional Controls */}
        <button className="icon-btn" title="Grid View">
          <GridIcon />
        </button>
        <button className="icon-btn" title="Fullscreen" onClick={onFullscreenToggle}>
          <FullscreenIcon />
        </button>

        <div className="separator"></div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button 
            className="icon-btn zoom-btn"
            onClick={() => onZoomChange(zoomLevel - 10)}
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOutIcon />
          </button>
          <span className="zoom-level">{zoomLevel}%</span>
          <button 
            className="icon-btn zoom-btn"
            onClick={() => onZoomChange(zoomLevel + 10)}
            title="Zoom In (Ctrl +)"
          >
            <ZoomInIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
