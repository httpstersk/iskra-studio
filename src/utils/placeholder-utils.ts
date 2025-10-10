/**
 * Utility functions for creating placeholder images and loading states
 */

/**
 * Creates a variation placeholder with the variation number displayed
 * @param width - Width of the placeholder
 * @param height - Height of the placeholder
 * @param variationNumber - The variation number to display (1-12)
 * @returns Data URL for the placeholder image
 */
export function createVariationPlaceholder(
  width: number,
  height: number,
  variationNumber: number
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
  }

  // Dark semi-transparent background
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, width, height);

  // Dashed border
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(0, 0, width, height);

  // Calculate font size based on canvas dimensions
  const fontSize = Math.min(width, height) * 0.4;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw variation number
  ctx.fillStyle = "#ffffff";
  ctx.fillText(variationNumber.toString(), width / 2, height / 2);

  return canvas.toDataURL();
}
