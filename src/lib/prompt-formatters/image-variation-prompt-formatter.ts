/**
 * Formats image variation prompts with Fincher-style cinematography directives
 */

/**
 * Formats a prompt for image variation generation with Fincher-style cinematography
 * @param directive - Camera directive from CAMERA_VARIATIONS
 * @param userPrompt - Optional user-provided prompt for additional context
 * @returns Formatted prompt with cinematography instructions
 */
export function formatImageVariationPrompt(
  directive: string,
  userPrompt?: string
): string {
  const userPromptSection = userPrompt ? `\n\nUSER PROMPT:\n${userPrompt}` : "";

  return `
    INSTRUCTIONS:
        - Apply this cinematography directive: ${directive}.
        - Recompose the scene with Fincher-style controlled framing and meticulous visual discipline.
    CAMERA AESTHETICS:
        - Lens: 35mm or 50mm prime, deep focus (f/4–f/5.6) for clinical clarity.
    LIGHTING AND TONE:
        - Controlled, low-key lighting with soft diffusion and strong contrast edges.
        - Retain the original image's color palette and grading *only* for tone and atmosphere.
    VISUAL DISCIPLINE:
        - Remove all objects, figures, and environmental elements not related to the user prompt.
        - Maintain clean geometry, architectural lines, and balanced composition.
        - Focus on visual tension through framing, distance, and light control.
    CINEMATIC MOOD:
        - Subtle use of haze or particulate atmosphere for depth.
        - Crisp textures and calibrated highlights (avoid bloom or oversaturation).
        - Preserve the rendering style, tonal values, and aesthetic continuity of the reference, but rebuild composition, camera, and set design to suit this controlled aesthetic.
    ${userPromptSection}
`;
}
