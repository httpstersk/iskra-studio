/**
 * Transform calculation utilities
 *
 * This module provides utilities for geometric transformations including rotation,
 * scaling, bounding box calculations, and coordinate transformations for canvas elements.
 *
 * @module transform-utils
 */

import type { CanvasElement } from "./viewport-utils";

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Transform properties for canvas elements
 */
export interface Transform {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Rotation in degrees */
  rotation: number;
  /** X scale factor */
  scaleX?: number;
  /** Y scale factor */
  scaleY?: number;
}

/**
 * Rectangle representing axis-aligned bounding box
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts degrees to radians.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 *
 * @example
 * ```typescript
 * const rad = degreesToRadians(90); // π/2
 * ```
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 *
 * @example
 * ```typescript
 * const deg = radiansToDegrees(Math.PI); // 180
 * ```
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Rotates a point around an origin point.
 *
 * @param point - Point to rotate
 * @param origin - Origin point to rotate around
 * @param angle - Rotation angle in degrees
 * @returns Rotated point
 *
 * @example
 * ```typescript
 * const point = { x: 100, y: 0 };
 * const origin = { x: 0, y: 0 };
 * const rotated = rotatePoint(point, origin, 90);
 * // rotated ≈ { x: 0, y: 100 }
 * ```
 */
export function rotatePoint(point: Point, origin: Point, angle: number): Point {
  const rad = degreesToRadians(angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = point.x - origin.x;
  const dy = point.y - origin.y;

  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/**
 * Calculates the four corners of a rectangle.
 *
 * @param rect - Rectangle to get corners for
 * @returns Array of four corner points [topLeft, topRight, bottomRight, bottomLeft]
 *
 * @example
 * ```typescript
 * const rect = { x: 100, y: 100, width: 50, height: 30 };
 * const corners = getRectangleCorners(rect);
 * ```
 */
export function getRectangleCorners(
  rect: Rectangle,
): [Point, Point, Point, Point] {
  return [
    { x: rect.x, y: rect.y }, // top-left
    { x: rect.x + rect.width, y: rect.y }, // top-right
    { x: rect.x + rect.width, y: rect.y + rect.height }, // bottom-right
    { x: rect.x, y: rect.y + rect.height }, // bottom-left
  ];
}

/**
 * Calculates axis-aligned bounding box for a rotated rectangle.
 *
 * @param element - Canvas element with position, size, and rotation
 * @returns Bounding box that encompasses the rotated rectangle
 *
 * @example
 * ```typescript
 * const element = { x: 100, y: 100, width: 50, height: 30, rotation: 45 };
 * const bbox = calculateRotatedBoundingBox(element);
 * ```
 */
export function calculateRotatedBoundingBox(
  element: CanvasElement & { rotation?: number },
): Rectangle {
  const rotation = element.rotation || 0;

  if (rotation === 0 || rotation === 360) {
    return {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    };
  }

  const corners = getRectangleCorners({
    x: 0,
    y: 0,
    width: element.width,
    height: element.height,
  });

  const origin = { x: 0, y: 0 };
  const rotatedCorners = corners.map((corner) =>
    rotatePoint(corner, origin, rotation),
  );

  const xs = rotatedCorners.map((c) => c.x);
  const ys = rotatedCorners.map((c) => c.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: element.x + minX,
    y: element.y + minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculates the center point of a rectangle.
 *
 * @param rect - Rectangle to find center of
 * @returns Center point
 *
 * @example
 * ```typescript
 * const rect = { x: 100, y: 100, width: 50, height: 30 };
 * const center = getRectangleCenter(rect); // { x: 125, y: 115 }
 * ```
 */
export function getRectangleCenter(rect: Rectangle): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

/**
 * Applies scale transformation to an element while maintaining aspect ratio.
 *
 * @param element - Canvas element to scale
 * @param scale - Scale factor
 * @returns New dimensions
 *
 * @example
 * ```typescript
 * const element = { x: 100, y: 100, width: 50, height: 30 };
 * const scaled = applyScale(element, 2); // { width: 100, height: 60 }
 * ```
 */
export function applyScale(
  element: CanvasElement,
  scale: number,
): { width: number; height: number } {
  return {
    width: element.width * scale,
    height: element.height * scale,
  };
}

/**
 * Calculates new dimensions that fit within maximum bounds while maintaining aspect ratio.
 *
 * @param width - Original width
 * @param height - Original height
 * @param maxWidth - Maximum width constraint
 * @param maxHeight - Maximum height constraint
 * @returns Fitted dimensions
 *
 * @example
 * ```typescript
 * const fitted = fitToSize(1920, 1080, 800, 600);
 * // fitted = { width: 800, height: 450 }
 * ```
 */
export function fitToSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const aspectRatio = width / height;
  let newWidth = maxWidth;
  let newHeight = maxWidth / aspectRatio;

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = maxHeight * aspectRatio;
  }

  return {
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Calculates dimensions that cover a target size while maintaining aspect ratio.
 * Opposite of fitToSize - ensures no empty space.
 *
 * @param width - Original width
 * @param height - Original height
 * @param targetWidth - Target width to cover
 * @param targetHeight - Target height to cover
 * @returns Dimensions that cover the target
 *
 * @example
 * ```typescript
 * const covered = coverSize(800, 600, 1920, 1080);
 * // Result will cover 1920x1080 with no gaps
 * ```
 */
export function coverSize(
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): { width: number; height: number } {
  const aspectRatio = width / height;
  const targetAspect = targetWidth / targetHeight;

  if (aspectRatio > targetAspect) {
    return {
      width: targetHeight * aspectRatio,
      height: targetHeight,
    };
  } else {
    return {
      width: targetWidth,
      height: targetWidth / aspectRatio,
    };
  }
}

/**
 * Constrains a rectangle to stay within bounds.
 *
 * @param rect - Rectangle to constrain
 * @param bounds - Boundary rectangle
 * @returns Constrained rectangle
 *
 * @example
 * ```typescript
 * const rect = { x: -10, y: 50, width: 100, height: 50 };
 * const bounds = { x: 0, y: 0, width: 800, height: 600 };
 * const constrained = constrainToBounds(rect, bounds);
 * // constrained.x will be 0
 * ```
 */
export function constrainToBounds(
  rect: Rectangle,
  bounds: Rectangle,
): Rectangle {
  return {
    x: Math.max(
      bounds.x,
      Math.min(rect.x, bounds.x + bounds.width - rect.width),
    ),
    y: Math.max(
      bounds.y,
      Math.min(rect.y, bounds.y + bounds.height - rect.height),
    ),
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Calculates distance between two points.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance between points
 *
 * @example
 * ```typescript
 * const distance = getDistance({ x: 0, y: 0 }, { x: 3, y: 4 }); // 5
 * ```
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates angle between two points in degrees.
 *
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Angle in degrees
 *
 * @example
 * ```typescript
 * const angle = getAngle({ x: 0, y: 0 }, { x: 1, y: 1 }); // 45 degrees
 * ```
 */
export function getAngle(p1: Point, p2: Point): number {
  return radiansToDegrees(Math.atan2(p2.y - p1.y, p2.x - p1.x));
}

/**
 * Normalizes rotation angle to 0-360 degree range.
 *
 * @param angle - Angle in degrees
 * @returns Normalized angle
 *
 * @example
 * ```typescript
 * const angle = normalizeAngle(450); // 90
 * const angle2 = normalizeAngle(-90); // 270
 * ```
 */
export function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Checks if two rectangles intersect.
 *
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns True if rectangles intersect
 *
 * @example
 * ```typescript
 * const r1 = { x: 0, y: 0, width: 100, height: 100 };
 * const r2 = { x: 50, y: 50, width: 100, height: 100 };
 * const intersects = rectanglesIntersect(r1, r2); // true
 * ```
 */
export function rectanglesIntersect(
  rect1: Rectangle,
  rect2: Rectangle,
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect1.x > rect2.x + rect2.width ||
    rect1.y + rect1.height < rect2.y ||
    rect1.y > rect2.y + rect2.height
  );
}

/**
 * Calculates union of multiple rectangles (smallest rectangle containing all).
 *
 * @param rectangles - Array of rectangles
 * @returns Union rectangle, or null if array is empty
 *
 * @example
 * ```typescript
 * const rects = [
 *   { x: 0, y: 0, width: 100, height: 100 },
 *   { x: 150, y: 150, width: 50, height: 50 }
 * ];
 * const union = getRectanglesUnion(rects);
 * // union = { x: 0, y: 0, width: 200, height: 200 }
 * ```
 */
export function getRectanglesUnion(rectangles: Rectangle[]): Rectangle | null {
  if (rectangles.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  rectangles.forEach((rect) => {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
