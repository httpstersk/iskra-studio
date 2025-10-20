/**
 * Formats B-roll variation prompts with style-matched cinematography
 * Uses image analysis to ensure B-rolls match the reference image's aesthetic
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";

/**
 * Formats a prompt for B-roll variation generation with style-matched cinematography
 * @param directive - B-roll directive from B_ROLL_VARIATIONS
 * @param styleAnalysis - Style and mood analysis from the reference image
 * @param userPrompt - Optional user-provided prompt for additional context
 * @returns Formatted prompt with cinematography instructions and style matching
 */
export function formatBrollVariationPrompt(
  directive: string,
  styleAnalysis: ImageStyleMoodAnalysis,
  userPrompt?: string
): string {
  const userPromptSection = userPrompt ? `\n\nUSER PROMPT:\n${userPrompt}` : "";

  // Extract key style elements for matching
  const colorPalette = styleAnalysis.colorPalette.dominant.join(", ");
  const lightingQuality = styleAnalysis.lighting.quality;
  const lightingDirection = styleAnalysis.lighting.direction;
  const primaryMood = styleAnalysis.mood.primary;
  const atmosphericQualities = styleAnalysis.lighting.atmosphere.join(", ");

  return `
    INSTRUCTIONS:
        - Create a B-ROLL shot: ${directive}.
        - Match the reference image's cinematic style and atmosphere exactly.
        - Focus on supporting detail that enhances the main footage.
    STYLE MATCHING:
        - Color Palette: ${colorPalette}
        - Lighting: ${lightingQuality} lighting with ${lightingDirection}
        - Mood: ${primaryMood}
        - Atmospheric Qualities: ${atmosphericQualities}
    CAMERA AESTHETICS:
        - Lens: 35mm or 50mm prime, controlled depth of field.
        - Composition: Clean, purposeful framing that supports the narrative.
    LIGHTING AND TONE:
        - Match the reference's lighting approach and tonal values.
        - Preserve color grading, saturation level, and temperature.
    VISUAL DISCIPLINE:
        - Focus on textures, details, and atmospheric elements.
        - Maintain the aesthetic continuity of the reference image.
        - Emphasize visual elements that add production value.
    CINEMATIC MOOD:
        - Preserve the emotional quality and energy level of the reference.
        - Use atmospheric effects that match the reference style.
        - Keep textures and highlights consistent with the source material.
    ${userPromptSection}
`;
}
