import React from 'react';
import './TopBar.css';

const TopBar = ({ pages, activePage, onPageSelect, viewports, activeViewport, onViewportSelect }) => {
  return (
    <div className="topbar-container">
      <div className="brand">
        <span className="logo-text">Reno</span>
      </div>
      
      <div className="controls-group">
        <div className="selector-group">
          <span className="label">Page:</span>
          <select 
            value={activePage} 
            onChange={(e) => onPageSelect(e.target.value)}
            className="dropdown"
          >
            {pages.map(page => (
              <option key={page.path} value={page.path}>
                {page.path} ({page.count})
              </option>
            ))}
          </select>
        </div>

        {viewports && viewports.length > 0 && (
          <div className="selector-group">
            <span className="label">Viewport:</span>
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
      </div>
      
      <div className="topbar-right">
         <span className="view-mode">Preview Mode</span>
      </div>
    </div>
  );
};

export default TopBar;
