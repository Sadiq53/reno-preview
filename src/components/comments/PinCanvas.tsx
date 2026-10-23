"use client";

import React, { useState, useRef } from "react";
import AnnotationMarker from "./AnnotationMarker";
import { calculateNormalizedPosition, formatCoordinateDisplay, NormalizedCoordinates } from "@/lib/canvas-math";

export interface PinItem {
  id: string;
  posX: number;
  posY: number;
  content: string;
  status?: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  user?: {
    name: string;
    avatarUrl?: string | null;
  };
  createdAt?: string;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  scrollY?: number | null;
}

export interface PinCanvasProps {
  viewportWidth: number;
  viewportHeight: number;
  activeMode: "browse" | "comment" | "inspect";
  annotations: PinItem[];
  selectedPinId?: string | null;
  onPinSelect?: (id: string | null) => void;
  onPinDrop?: (coords: NormalizedCoordinates & { clientX: number; clientY: number }) => void;
  iframeScrollY?: number;
  onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
}

export default function PinCanvas({
  viewportWidth,
  viewportHeight,
  activeMode,
  annotations = [],
  selectedPinId,
  onPinSelect,
  onPinDrop,
  iframeScrollY = 0,
  onWheel,
}: PinCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoverCoords, setHoverCoords] = useState<{ posX: number; posY: number } | null>(null);

  const isCommentMode = activeMode === "comment";

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCommentMode || !canvasRef.current) {
      if (hoverCoords) setHoverCoords(null);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Scale-invariant normalized percentage:
    // Because rect is from getBoundingClientRect(), it matches the visual element size after CSS scale()
    const posX = Math.max(0, Math.min(100, Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(2))));
    const posY = Math.max(0, Math.min(100, Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(2))));

    setHoverCoords({ posX, posY });
  };

  const handleMouseLeave = () => {
    setHoverCoords(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if clicked directly on an existing marker
    const target = e.target as HTMLElement;
    if (target.closest("[data-marker]")) {
      return;
    }

    if (!isCommentMode) {
      // In browse/inspect mode: clicking outside closes any open comment tooltip/selection
      onPinSelect?.(null);
      return;
    }

    if (!onPinDrop || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const normalized = calculateNormalizedPosition({
      clientX: e.clientX,
      clientY: e.clientY,
      canvasRect: rect,
      activeViewportWidth: viewportWidth,
      activeViewportHeight: viewportHeight,
      scrollOffset: iframeScrollY,
    });

    onPinDrop({
      ...normalized,
      clientX: e.clientX,
      clientY: e.clientY,
    });
  };

  return (
    <div
      ref={canvasRef}
      className={`absolute inset-0 z-30 overflow-hidden ${
        isCommentMode ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onWheel={onWheel}
    >
      {/* Transparent dismiss backdrop when a pin popover is open: absorbs outside clicks so they never bleed into iframe */}
      {selectedPinId && (
        <div
          className="absolute inset-0 z-20 pointer-events-auto bg-transparent cursor-default"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onPinSelect?.(null);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        />
      )}

      {/* Scroll-Anchored Annotations Layer */}
      <div
        className="absolute inset-0 pointer-events-none transition-transform duration-75 ease-out"
        style={{
          transform: `translateY(-${iframeScrollY}px)`,
        }}
      >
        {annotations.map((pin, index) => {
          // Absolute document Y coordinate:
          const docY = (pin.scrollY || 0) + ((pin.posY || 0) / 100) * (pin.viewportHeight || viewportHeight);
          // Visual Y relative to current visible viewport:
          const visualY = docY - iframeScrollY;
          const visualYPercent = (visualY / viewportHeight) * 100;
          const isSelected = selectedPinId === pin.id;

          return (
            <div
              key={pin.id}
              data-marker="true"
              data-marker-id={pin.id}
              style={{
                position: "absolute",
                left: `${pin.posX}%`,
                top: `${docY}px`,
                pointerEvents: "auto",
                zIndex: isSelected ? 40 : 25,
              }}
            >
              <AnnotationMarker
                id={pin.id}
                index={index + 1}
                posX={pin.posX}
                posY={visualYPercent}
                content={pin.content}
                status={pin.status}
                user={pin.user}
                createdAt={pin.createdAt}
                viewportLabel={`${pin.viewportWidth || viewportWidth}×${pin.viewportHeight || viewportHeight}`}
                isSelected={isSelected}
                onSelect={onPinSelect}
              />
            </div>
          );
        })}
      </div>

      {/* Dynamic Scale-Invariant Cursor Pin Follower in Comment Mode */}
      {isCommentMode && hoverCoords && (
        <div
          className="pointer-events-none absolute z-50 transition-opacity duration-75"
          style={{
            left: `${hoverCoords.posX}%`,
            top: `${hoverCoords.posY}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Precision Dot Icon matching dropped dot */}
          <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-rose-500 shadow-md">
            <span className="h-1 w-1 rounded-full bg-white opacity-95" />
          </div>
          <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900/90 px-2 py-0.5 text-[9px] font-mono text-neutral-300 border border-neutral-700 shadow-md">
            {formatCoordinateDisplay(hoverCoords)}
          </div>
        </div>
      )}
    </div>
  );
}
