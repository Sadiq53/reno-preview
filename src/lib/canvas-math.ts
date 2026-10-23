/**
 * canvas-math.ts
 * Implements percentage-based coordinate normalization for responsive preview annotations.
 * Ensures pins remain anchored to exact visual DOM locations across viewports, zoom levels, and resize operations.
 */

export interface RawClickEvent {
  clientX: number;
  clientY: number;
  canvasRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  scrollOffset?: number;
  activeViewportWidth: number;
  activeViewportHeight: number;
}

export interface NormalizedCoordinates {
  posX: number; // Stored as percentage of current viewport (0.00% to 100.00%)
  posY: number; // Stored as percentage of current viewport (0.00% to 100.00%)
  viewportWidth: number;
  viewportHeight: number;
  scrollY: number;
}

/**
 * Calculates percentage-based normalized coordinates from a raw click event.
 */
export function calculateNormalizedPosition(e: RawClickEvent): NormalizedCoordinates {
  // Use canvasRect.width and canvasRect.height directly.
  // Because canvasRect is from getBoundingClientRect(), it accounts for any CSS scale() transforms.
  // (clientX - canvasRect.left) / canvasRect.width gives the exact invariant percentage (0 to 1).
  const normalizedX = (e.clientX - e.canvasRect.left) / e.canvasRect.width;
  const normalizedY = (e.clientY - e.canvasRect.top) / e.canvasRect.height;

  const rawPosX = normalizedX * 100;
  const rawPosY = normalizedY * 100;

  // Clamped between 0.00% and 100.00% with 2 decimal precision
  const posX = Math.max(0, Math.min(100, Number(rawPosX.toFixed(2))));
  const posY = Math.max(0, Math.min(100, Number(rawPosY.toFixed(2))));

  return {
    posX,
    posY,
    viewportWidth: Math.round(e.activeViewportWidth),
    viewportHeight: Math.round(e.activeViewportHeight),
    scrollY: Math.round(e.scrollOffset || 0),
  };
}

/**
 * Denormalizes percentages back into pixel coordinates for a given viewport dimension.
 */
export function denormalizePosition(
  coords: { posX: number; posY: number },
  viewport: { width: number; height: number }
): { x: number; y: number } {
  return {
    x: Math.round((coords.posX / 100) * viewport.width),
    y: Math.round((coords.posY / 100) * viewport.height),
  };
}

/**
 * Formats coordinates for tooltips and badges (e.g., "X: 45.2% · Y: 12.8%").
 */
export function formatCoordinateDisplay(coords: { posX: number; posY: number }): string {
  return `X: ${coords.posX.toFixed(1)}% · Y: ${coords.posY.toFixed(1)}%`;
}
