import React, { useState, useEffect, useRef } from 'react';
import AnnotationMarker from './AnnotationMarker';
import './PreviewWindow.css';

const PreviewWindow = ({ url, annotations = [], selectedId, viewportSize }) => {
  if (!url) return <div className="preview-placeholder">Enter a URL to preview</div>;

  const iframeRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  // Determine active viewport size
  const viewportWidth = viewportSize?.width || 375;
  const viewportHeight = viewportSize?.height || 667;

  // Handle iframe load and scroll listener
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
        try {
            // Attempt to access contentWindow (requires same-origin/proxy)
            if (iframe.contentWindow) {
                const win = iframe.contentWindow;
                
                // Initialize scroll
                setScrollY(win.scrollY);
                
                // Add listener
                const onScroll = () => {
                    setScrollY(win.scrollY);
                };
                win.addEventListener('scroll', onScroll);
                
                // Cleanup listener on unmount/reload
                return () => win.removeEventListener('scroll', onScroll);
            }
        } catch (e) {
            console.warn("Cross-origin access blocked or iframe not ready", e);
        }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [url]); // Re-run if URL changes (new iframe content)

  // Scroll to selected comment
  useEffect(() => {
    if (selectedId && iframeRef.current && iframeRef.current.contentWindow) {
      const selected = annotations.find(a => a.id === selectedId);
      if (selected && selected.position) {
         try {
             // Scroll center the comment
             // Target Y = absolute Y - half viewport
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

  return (
    <div className="preview-container">
      <div className="device-frame" style={{ width: viewportWidth + 20 }}>
         <div className="device-chrome">
            <div className="device-url-bar">{url}</div>
         </div>
         
         <div className="device-screen" style={{ width: viewportWidth, height: viewportHeight }}>
            {/* The Annotation Layer */}
            <div className="annotation-layer">
               {annotations.map((ann) => {
                 const pos = ann.position || { x: 0, y: 0 };
                 
                   // Render relative to current scroll
                 // If scrolled down 100px, and item is at 500px absolute, it should be rendered at 400px.
                 const topPos = pos.y - scrollY;
                 
                 const isSelected = selectedId === ann.id;
                 
                 // Handle Horizontal positioning
                 // Reverting to percentage based on re-analysis of data (e.g. x=88 is scrollbar).
                 // User 'misalignment' likely due to missing transform centering.
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
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent ensuring it doesn't bubbling oddly?
                            // We need a way to set selectedId from here? 
                            // But PreviewWindow props don't include onSelect.
                            // We should probably rely on the Hover state for "opening" content as per request "open on hover".
                            // But if we want it to be "selected" effectively:
                            // The user said "open comment on hover or tap".
                            // My AnnotationMarker handles hover internally.
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
              // Allow same-origin access features? 
              // Vite proxy makes it same-origin effectively for the main document context *if* content-type is correct.
            />
         </div>
         <div className="device-footer">
            Mobile Simulator ({viewportWidth}x{viewportHeight})
         </div>
      </div>
      
      <div className="info-panel">
         <p><strong>Note:</strong> Markers scroll with the page content.</p>
      </div>
    </div>
  );
};

export default PreviewWindow;
