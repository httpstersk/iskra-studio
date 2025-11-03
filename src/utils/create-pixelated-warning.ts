import { CANVAS_GRID } from "@/constants/canvas";

const PIXEL_SIZE = CANVAS_GRID.PIXEL_SIZE;
const BASE_SIZE = 32;

/**
 * Creates a pixelated warning triangle icon with exclamation mark
 *
 * @param size - Target size for the warning icon (default: 160px for 8x8 grid at 20px/pixel)
 * @returns Canvas element containing the pixelated warning sign
 */
export function createPixelatedWarning(
  size: number = BASE_SIZE * 5,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return canvas;
  }

  // Disable smoothing for crisp pixels
  ctx.imageSmoothingEnabled = false;

  // Calculate grid size (how many pixels in the icon)
  const gridSize = Math.floor(size / PIXEL_SIZE);
  const pixelSize = size / gridSize;

  // Helper to draw a pixel at grid coordinates
  const drawPixel = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
  };

  // Define colors
  const yellow = "#FFD700";
  const darkYellow = "#FFA500";
  const black = "#000000";
  const red = "#FF0000";

  // Draw pixelated warning triangle
  // Using a simple triangle pattern for an 8x8 grid
  const centerX = Math.floor(gridSize / 2);
  const centerY = Math.floor(gridSize / 2);

  // Draw triangle outline (yellow/orange gradient)
  // Top point
  drawPixel(centerX, 1, yellow);

  // Second row
  drawPixel(centerX - 1, 2, yellow);
  drawPixel(centerX, 2, yellow);
  drawPixel(centerX + 1, 2, yellow);

  // Third row
  drawPixel(centerX - 2, 3, darkYellow);
  drawPixel(centerX - 1, 3, yellow);
  drawPixel(centerX, 3, yellow);
  drawPixel(centerX + 1, 3, yellow);
  drawPixel(centerX + 2, 3, darkYellow);

  // Fourth row
  drawPixel(centerX - 2, 4, darkYellow);
  drawPixel(centerX - 1, 4, yellow);
  drawPixel(centerX, 4, yellow);
  drawPixel(centerX + 1, 4, yellow);
  drawPixel(centerX + 2, 4, darkYellow);

  // Fifth row
  drawPixel(centerX - 3, 5, darkYellow);
  drawPixel(centerX - 2, 5, yellow);
  drawPixel(centerX - 1, 5, yellow);
  drawPixel(centerX, 5, yellow);
  drawPixel(centerX + 1, 5, yellow);
  drawPixel(centerX + 2, 5, yellow);
  drawPixel(centerX + 3, 5, darkYellow);

  // Sixth row (bottom)
  for (let i = -3; i <= 3; i++) {
    drawPixel(centerX + i, 6, i === -3 || i === 3 ? darkYellow : yellow);
  }

  // Draw exclamation mark (black/red)
  // Exclamation body
  drawPixel(centerX, 3, black);
  drawPixel(centerX, 4, black);

  // Exclamation dot
  drawPixel(centerX, 5, red);

  // Add a subtle red glow/outline
  ctx.shadowColor = red;
  ctx.shadowBlur = pixelSize;

  return canvas;
}

/**
 * Generates a data URL for the pixelated warning icon
 *
 * @param size - Target size for the warning icon
 * @returns Data URL string of the warning icon
 */
export function createPixelatedWarningDataUrl(size?: number): string {
  const canvas = createPixelatedWarning(size);
  return canvas.toDataURL("image/png");
}
