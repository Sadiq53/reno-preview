import React from 'react';
import './Layout.css';

const Layout = ({ topBar, sidebar, children, sidebarVisible = true }) => {
  return (
    <div className="layout-container">
      <div className="layout-header">
        {topBar}
      </div>
      <div className="layout-body">
        <div className="layout-main">
          {children}
        </div>
        <div className={`layout-sidebar ${sidebarVisible ? 'open' : 'closed'}`}>
          {sidebar}
        </div>
      </div>
    </div>
  );
};

export default Layout;
