"use client";

import React from "react";

interface CornerBracketsProps {
  className?: string;
  size?: number; // width and height of each bracket in px
  color?: string; // Tailwind border color class
  offset?: number; // negative margin / placement offset in px
}

export default function CornerBrackets({
  className = "",
  size = 7,
  color = "border-foreground/40",
  offset = -3,
}: CornerBracketsProps) {
  const bracketStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  return (
    <>
      {/* Top-Left Bracket ┌ */}
      <span
        aria-hidden="true"
        style={{ ...bracketStyle, top: `${offset}px`, left: `${offset}px` }}
        className={`pointer-events-none absolute border-t-[1.5px] border-l-[1.5px] ${color} ${className}`}
      />

      {/* Top-Right Bracket ┐ */}
      <span
        aria-hidden="true"
        style={{ ...bracketStyle, top: `${offset}px`, right: `${offset}px` }}
        className={`pointer-events-none absolute border-t-[1.5px] border-r-[1.5px] ${color} ${className}`}
      />

      {/* Bottom-Left Bracket └ */}
      <span
        aria-hidden="true"
        style={{ ...bracketStyle, bottom: `${offset}px`, left: `${offset}px` }}
        className={`pointer-events-none absolute border-b-[1.5px] border-l-[1.5px] ${color} ${className}`}
      />

      {/* Bottom-Right Bracket ┘ */}
      <span
        aria-hidden="true"
        style={{ ...bracketStyle, bottom: `${offset}px`, right: `${offset}px` }}
        className={`pointer-events-none absolute border-b-[1.5px] border-r-[1.5px] ${color} ${className}`}
      />
    </>
  );
}
