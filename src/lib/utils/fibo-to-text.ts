/**
 * Converts FIBO structured prompt to a text prompt for Seedream/Nano Banana
 */

export function fiboStructuredToText(structuredPrompt: any): string {
  const parts: string[] = [];

  // Start with short description
  if (structuredPrompt.short_description) {
    parts.push(structuredPrompt.short_description);
  }

  // Add background/setting
  if (structuredPrompt.background_setting) {
    parts.push(`Setting: ${structuredPrompt.background_setting}`);
  }

  // Add lighting
  if (structuredPrompt.lighting) {
    const lighting = structuredPrompt.lighting;
    const lightingParts = [
      lighting.conditions,
      lighting.direction,
      lighting.shadows,
    ].filter(Boolean);
    if (lightingParts.length > 0) {
      parts.push(`Lighting: ${lightingParts.join(", ")}`);
    }
  }

  // Add aesthetics
  if (structuredPrompt.aesthetics) {
    const aesthetics = structuredPrompt.aesthetics;
    if (aesthetics.composition) {
      parts.push(`Composition: ${aesthetics.composition}`);
    }
    if (aesthetics.color_scheme) {
      parts.push(`Color: ${aesthetics.color_scheme}`);
    }
    if (aesthetics.mood_atmosphere) {
      parts.push(`Mood: ${aesthetics.mood_atmosphere}`);
    }
  }

  // Add photographic characteristics
  if (structuredPrompt.photographic_characteristics) {
    const photo = structuredPrompt.photographic_characteristics;
    const photoParts = [
      photo.camera_angle,
      photo.lens_focal_length,
      photo.depth_of_field,
      photo.focus,
    ].filter(Boolean);
    if (photoParts.length > 0) {
      parts.push(`Camera: ${photoParts.join(", ")}`);
    }
  }

  // Add style medium and artistic style
  const styleParts = [
    structuredPrompt.style_medium,
    structuredPrompt.artistic_style,
  ].filter(Boolean);
  if (styleParts.length > 0) {
    parts.push(`Style: ${styleParts.join(", ")}`);
  }

  return parts.join(". ");
}
