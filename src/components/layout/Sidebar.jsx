import React from 'react';
import './Sidebar.css';

const Sidebar = ({ comments, onCommentSelect }) => {
  return (
    <div className="sidebar-container">
      <div className="sidebar-header">
        <h3>Comments ({comments.length})</h3>
        <div className="sidebar-actions">
           {/* Icons could go here */}
        </div>
      </div>
      <div className="sidebar-list">
        {comments.map((comment) => (
          <div 
            key={comment.id} 
            className="sidebar-comment-card"
            onClick={() => onCommentSelect(comment.id)}
          >
            <div className="card-header">
                <div className="user-info">
                   <div className="avatar-circle">
                     {comment.user?.name ? comment.user.name.charAt(0) : '?'}
                   </div>
                   <span className="user-name">{comment.user?.name || 'Unknown'}</span>
                </div>
                <span className="status-badge">{comment.status || 'open'}</span>
            </div>
            
            <div className="card-content">
                {comment.content}
            </div>
            
            <div className="card-footer">
                <span className="reply-link">Reply</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
