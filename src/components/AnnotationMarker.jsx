import React, { useState } from 'react';
import './AnnotationMarker.css';

const AnnotationMarker = ({ position, content, user, isActive }) => {
  const { x, y } = position;
  const [isHovered, setIsHovered] = useState(false);

  // Show if active (selected) or hovered
  const showContent = isActive || isHovered;

  return (
    <div
      className={`annotation-marker-container ${isActive ? 'active' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mini-dot">
          {/* If you want initials inside the tiny dot, uncomment below.
              For now keeping it as a solid color dot for cleanliness as requested. */}
          {/* <span className="mini-initial">{user?.name?.charAt(0)}</span> */}
      </div>

      {showContent && (
        <div className="marker-popover">
            <div className="popover-header">
                <img src={user?.image || "https://via.placeholder.com/24"} alt={user?.name} className="popover-avatar" />
                <span className="popover-username">{user?.name}</span>
            </div>
            <div className="popover-body">
                {content}
            </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationMarker;
