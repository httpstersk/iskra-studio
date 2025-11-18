/**
 * Viewport and visibility calculation utilities
 *
 * This module provides utilities for viewport management, coordinate transformations,
 * and visibility culling for canvas applications. These utilities help optimize
 * rendering by only processing elements visible in the current viewport.
 *
 * @module viewport-utils
 */

/**
 * Viewport state representing the current view of the canvas
 */
export interface Viewport {
  /** X offset of the viewport */
  x: number;
  /** Y offset of the viewport */
  y: number;
  /** Scale/zoom level of the viewport */
  scale: number;
}

/**
 * Bounding box representing a rectangular area
 */
export interface BoundingBox {
  /** Left edge position */
  left: number;
  /** Top edge position */
  top: number;
  /** Right edge position */
  right: number;
  /** Bottom edge position */
  bottom: number;
}

/**
 * Canvas element with position and dimensions
 */
export interface CanvasElement {
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Width of the element */
  width: number;
  /** Height of the element */
  height: number;
}

/**
 * Canvas size dimensions
 */
export interface CanvasSize {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Converts canvas coordinates to screen coordinates based on viewport.
 *
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 * @param viewport - Current viewport state
 * @returns Screen coordinates
 *
 * @example
 * ```typescript
 * const viewport = { x: 100, y: 50, scale: 1.5 };
 * const screen = canvasToScreen(200, 150, viewport);
 * // screen = { x: 400, y: 275 }
 * ```
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: canvasX * viewport.scale + viewport.x,
    y: canvasY * viewport.scale + viewport.y,
  };
}

/**
 * Converts screen coordinates to canvas coordinates based on viewport.
 *
 * @param screenX - X coordinate in screen space
 * @param screenY - Y coordinate in screen space
 * @param viewport - Current viewport state
 * @returns Canvas coordinates
 *
 * @example
 * ```typescript
 * const viewport = { x: 100, y: 50, scale: 1.5 };
 * const canvas = screenToCanvas(400, 275, viewport);
 * // canvas = { x: 200, y: 150 }
 * ```
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: Viewport,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.x) / viewport.scale,
    y: (screenY - viewport.y) / viewport.scale,
  };
}

/**
 * Calculates the visible bounds in canvas space based on viewport and canvas size.
 *
 * @param viewport - Current viewport state
 * @param canvasSize - Size of the canvas container
 * @param buffer - Extra buffer area outside visible bounds (default: 100)
 * @returns Bounding box of visible area in canvas coordinates
 *
 * @example
 * ```typescript
 * const viewport = { x: 100, y: 50, scale: 1.0 };
 * const canvasSize = { width: 800, height: 600 };
 * const bounds = getVisibleBounds(viewport, canvasSize, 50);
 * ```
 */
export function getVisibleBounds(
  viewport: Viewport,
  canvasSize: CanvasSize,
  buffer = 100,
): BoundingBox {
  return {
    left: -viewport.x / viewport.scale - buffer,
    top: -viewport.y / viewport.scale - buffer,
    right: (canvasSize.width - viewport.x) / viewport.scale + buffer,
    bottom: (canvasSize.height - viewport.y) / viewport.scale + buffer,
  };
}

/**
 * Checks if an element is visible within the given bounding box.
 *
 * @param element - Canvas element to check
 * @param bounds - Bounding box to check against
 * @returns True if the element intersects with the bounds
 *
 * @example
 * ```typescript
 * const element = { x: 100, y: 100, width: 200, height: 150 };
 * const bounds = { left: 0, top: 0, right: 500, bottom: 500 };
 * const visible = isElementVisible(element, bounds); // true
 * ```
 */
export function isElementVisible(
  element: CanvasElement,
  bounds: BoundingBox,
): boolean {
  return !(
    element.x + element.width < bounds.left ||
    element.x > bounds.right ||
    element.y + element.height < bounds.top ||
    element.y > bounds.bottom
  );
}

/**
 * Filters a list of elements to only those visible in the viewport.
 * Uses viewport culling to improve rendering performance.
 *
 * @param elements - Array of canvas elements to filter
 * @param viewport - Current viewport state
 * @param canvasSize - Size of the canvas container
 * @param buffer - Extra buffer area outside visible bounds (default: 100)
 * @returns Array of visible elements
 *
 * @example
 * ```typescript
 * const allImages = [...]; // Array of placed images
 * const viewport = { x: 0, y: 0, scale: 1.0 };
 * const canvasSize = { width: 800, height: 600 };
 * const visibleImages = getVisibleElements(allImages, viewport, canvasSize);
 * ```
 */
export function getVisibleElements<T extends CanvasElement>(
  elements: T[],
  viewport: Viewport,
  canvasSize: CanvasSize,
  buffer = 100,
): T[] {
  const bounds = getVisibleBounds(viewport, canvasSize, buffer);
  return elements.filter((element) => isElementVisible(element, bounds));
}

/**
 * Calculates the center point of the viewport in canvas coordinates.
 *
 * @param viewport - Current viewport state
 * @param canvasSize - Size of the canvas container
 * @returns Center point in canvas coordinates
 *
 * @example
 * ```typescript
 * const viewport = { x: 100, y: 50, scale: 1.5 };
 * const canvasSize = { width: 800, height: 600 };
 * const center = getViewportCenter(viewport, canvasSize);
 * ```
 */
export function getViewportCenter(
  viewport: Viewport,
  canvasSize: CanvasSize,
): { x: number; y: number } {
  return {
    x: (canvasSize.width / 2 - viewport.x) / viewport.scale,
    y: (canvasSize.height / 2 - viewport.y) / viewport.scale,
  };
}

/**
 * Calculates viewport transform that centers on a specific point.
 *
 * @param targetX - X coordinate to center on (canvas space)
 * @param targetY - Y coordinate to center on (canvas space)
 * @param canvasSize - Size of the canvas container
 * @param scale - Desired scale level (default: 1.0)
 * @returns New viewport state
 *
 * @example
 * ```typescript
 * const canvasSize = { width: 800, height: 600 };
 * const viewport = centerViewportOn(400, 300, canvasSize, 1.5);
 * ```
 */
export function centerViewportOn(
  targetX: number,
  targetY: number,
  canvasSize: CanvasSize,
  scale = 1.0,
): Viewport {
  return {
    x: canvasSize.width / 2 - targetX * scale,
    y: canvasSize.height / 2 - targetY * scale,
    scale,
  };
}

/**
 * Clamps viewport scale within min and max bounds.
 *
 * @param scale - Current scale value
 * @param minScale - Minimum allowed scale (default: 0.1)
 * @param maxScale - Maximum allowed scale (default: 5.0)
 * @returns Clamped scale value
 *
 * @example
 * ```typescript
 * const scale = clampScale(10, 0.5, 3.0); // Returns 3.0
 * ```
 */
export function clampScale(
  scale: number,
  minScale = 0.1,
  maxScale = 5.0,
): number {
  return Math.max(minScale, Math.min(maxScale, scale));
}

/**
 * Applies zoom transformation to viewport while keeping a point fixed on screen.
 *
 * @param viewport - Current viewport state
 * @param screenX - Screen X coordinate to zoom towards
 * @param screenY - Screen Y coordinate to zoom towards
 * @param scaleDelta - Amount to change scale by (positive = zoom in)
 * @param minScale - Minimum allowed scale (default: 0.1)
 * @param maxScale - Maximum allowed scale (default: 5.0)
 * @returns New viewport state
 *
 * @example
 * ```typescript
 * const viewport = { x: 0, y: 0, scale: 1.0 };
 * const newViewport = zoomViewport(viewport, 400, 300, 0.1);
 * ```
 */
export function zoomViewport(
  viewport: Viewport,
  screenX: number,
  screenY: number,
  scaleDelta: number,
  minScale = 0.1,
  maxScale = 5.0,
): Viewport {
  const oldScale = viewport.scale;
  const newScale = clampScale(oldScale + scaleDelta, minScale, maxScale);

  if (newScale === oldScale) {
    return viewport;
  }

  const _scaleRatio = newScale / oldScale;
  const mouseX = (screenX - viewport.x) / oldScale;
  const mouseY = (screenY - viewport.y) / oldScale;

  return {
    x: screenX - mouseX * newScale,
    y: screenY - mouseY * newScale,
    scale: newScale,
  };
}

/**
 * Calculates bounding box that encompasses multiple elements.
 *
 * @param elements - Array of canvas elements
 * @returns Bounding box containing all elements
 *
 * @example
 * ```typescript
 * const elements = [
 *   { x: 100, y: 100, width: 50, height: 50 },
 *   { x: 200, y: 150, width: 100, height: 75 }
 * ];
 * const bounds = getElementsBoundingBox(elements);
 * ```
 */
export function getElementsBoundingBox(
  elements: CanvasElement[],
): BoundingBox | null {
  if (elements.length === 0) {
    return null;
  }

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  elements.forEach((element) => {
    left = Math.min(left, element.x);
    top = Math.min(top, element.y);
    right = Math.max(right, element.x + element.width);
    bottom = Math.max(bottom, element.y + element.height);
  });

  return { left, top, right, bottom };
}

/**
 * Calculates viewport that fits all elements in view with padding.
 *
 * @param elements - Array of canvas elements to fit
 * @param canvasSize - Size of the canvas container
 * @param padding - Padding around elements (default: 50)
 * @returns Viewport that fits all elements
 *
 * @example
 * ```typescript
 * const elements = [...]; // Array of images/videos
 * const canvasSize = { width: 800, height: 600 };
 * const viewport = fitElementsInView(elements, canvasSize, 100);
 * ```
 */
export function fitElementsInView(
  elements: CanvasElement[],
  canvasSize: CanvasSize,
  padding = 50,
): Viewport | null {
  const bounds = getElementsBoundingBox(elements);
  if (!bounds) {
    return null;
  }

  const contentWidth = bounds.right - bounds.left;
  const contentHeight = bounds.bottom - bounds.top;
  const contentCenterX = (bounds.left + bounds.right) / 2;
  const contentCenterY = (bounds.top + bounds.bottom) / 2;

  const scaleX = (canvasSize.width - padding * 2) / contentWidth;
  const scaleY = (canvasSize.height - padding * 2) / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1.0);

  return centerViewportOn(contentCenterX, contentCenterY, canvasSize, scale);
}
