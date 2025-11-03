/**
 * Utility functions for abbreviating camera directive text.
 *
 * Camera directives from CAMERA_VARIATIONS are verbose (e.g., "DUTCH ANGLE DYNAMIC — CAMERA TILTED 25-45 DEGREES...").
 * These utilities extract short, readable labels for UI display while preserving full text for tooltips and storage.
 */

/**
 * Abbreviates a camera directive for UI display.
 *
 * Extracts the label portion before the em dash (—) separator, or if no separator exists,
 * takes the first 3-5 words to create a concise label.
 *
 * @param directive - Full camera directive text
 * @returns Abbreviated camera directive label
 *
 * @example
 * ```typescript
 * abbreviateCameraDirective("DUTCH ANGLE DYNAMIC — CAMERA TILTED 25-45 DEGREES")
 * // Returns: "DUTCH ANGLE DYNAMIC"
 *
 * abbreviateCameraDirective("OVERHEAD BIRD'S EYE VIEW — CAMERA DIRECTLY ABOVE")
 * // Returns: "OVERHEAD BIRD'S EYE VIEW"
 *
 * abbreviateCameraDirective("Simple camera angle without separator")
 * // Returns: "Simple camera angle without"
 * ```
 */
export function abbreviateCameraDirective(directive: string): string {
  if (!directive || typeof directive !== "string") {
    return "";
  }

  const trimmed = directive.trim();

  if (trimmed.length === 0) {
    return "";
  }

  // Check for em dash separator (—)
  const emDashIndex = trimmed.indexOf("—");

  if (emDashIndex !== -1) {
    // Extract text before em dash and trim
    return trimmed.substring(0, emDashIndex).trim();
  }

  // Check for regular dash separator (-)
  const dashIndex = trimmed.indexOf(" - ");

  if (dashIndex !== -1) {
    // Extract text before dash and trim
    return trimmed.substring(0, dashIndex).trim();
  }

  // No separator found - take first 3-5 words
  const words = trimmed.split(/\s+/);

  if (words.length <= 3) {
    return trimmed;
  }

  // Take 4 words if available, otherwise 3
  const wordCount = words.length >= 4 ? 4 : 3;
  return words.slice(0, wordCount).join(" ");
}

/**
 * Extracts camera directive label and description as separate components.
 *
 * Useful for advanced UI scenarios where label and description need to be
 * displayed separately (e.g., title and subtitle).
 *
 * @param directive - Full camera directive text
 * @returns Object with label and description, or null if parsing fails
 *
 * @example
 * ```typescript
 * parseCameraDirective("DUTCH ANGLE DYNAMIC — CAMERA TILTED 25-45 DEGREES")
 * // Returns: { label: "DUTCH ANGLE DYNAMIC", description: "CAMERA TILTED 25-45 DEGREES" }
 * ```
 */
export function parseCameraDirective(directive: string): {
  description: string;
  label: string;
} | null {
  if (!directive || typeof directive !== "string") {
    return null;
  }

  const trimmed = directive.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Check for em dash separator
  const emDashIndex = trimmed.indexOf("—");

  if (emDashIndex !== -1) {
    return {
      description: trimmed.substring(emDashIndex + 1).trim(),
      label: trimmed.substring(0, emDashIndex).trim(),
    };
  }

  // Check for regular dash separator
  const dashIndex = trimmed.indexOf(" - ");

  if (dashIndex !== -1) {
    return {
      description: trimmed.substring(dashIndex + 3).trim(),
      label: trimmed.substring(0, dashIndex).trim(),
    };
  }

  // No separator - return full text as label with empty description
  return {
    description: "",
    label: trimmed,
  };
}
