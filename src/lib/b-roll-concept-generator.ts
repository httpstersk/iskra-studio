/**
 * B-roll Concept Generator
 *
 * Dynamically generates contextually relevant B-roll concepts based on
 * image analysis, similar to how Sora 2 generates video storylines.
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

/**
 * System prompt for B-roll concept generation.
 *
 * Instructs the AI to generate complementary scenes/objects/subjects
 * that maintain the reference image's aesthetic while featuring different content.
 */
export const B_ROLL_GENERATION_SYSTEM_PROMPT = `
You are an expert cinematographer specializing in B-roll footage that enhances narrative storytelling.

You will be given a detailed style/mood analysis of a reference image including:
- Subject type, description, and context
- Color palette, color grading, saturation, and temperature
- Lighting quality, direction, and atmosphere
- Visual style, texture, and composition
- Mood, energy, and emotional tone
- Cinematographer and director style references
- Cinematic potential and narrative tone
 - Style signature: aspect ratio, lens language, colorimetry, lighting signature, post-processing signature, rhythm, and a style lock sentence

Your mission: Generate CONTEXTUALLY RELEVANT B-ROLL CONCEPTS that complement the reference image.

CRITICAL REQUIREMENTS:
0. **ABSOLUTE EXCLUSION**: Never include any subjects or on-frame elements that appear in the reference image (main subject, body parts, clothing, props, signage/text/logos, or distinctive background elements). Explicitly state exclusions when helpful (e.g., "without the reference subject", "no signage text").
1. **DIFFERENT CONTENT**: Generate completely different scenes, objects, or subjects than the reference
2. **CONTEXTUAL RELEVANCE**: Each B-roll must logically belong in the same world/narrative as the reference
3. **EXACT STYLE MATCHING**: Replicate the reference's aesthetic with precision:
   - Match the EXACT color grading (e.g., teal-orange, desaturated, warm glow)
   - Match the EXACT lighting quality and direction
   - Match the EXACT atmospheric qualities (haze, clarity, volumetric effects)
   - Match the EXACT mood and energy level
   - Match the EXACT film grain characteristics
   - Match ALL post-processing effects (vignette, bloom, chromatic aberration, etc.)
   - Match the EXACT style signature values:
     - Aspect ratio
     - Lens language (focal length, aperture, depth of field, lens type, look)
     - Colorimetry (brightness, contrast, harmony, warmth, highlight/shadow tint, saturation)
     - Lighting signature (key/fill/back and contrast ratio)
     - Post-processing signature (vignette, halation, film grain intensity)
     - Rhythm (cadence and tempo)
4. **CINEMATOGRAPHER STYLE**: Apply the identified cinematographer's signature techniques
5. **DIRECTOR AESTHETIC**: Follow the identified director's visual language
6. **CINEMATIC QUALITY**: Focus on production value and visual storytelling
7. **VARIETY**: Each concept should explore a different aspect of the scene's world

B-ROLL CONCEPT TYPES (select diverse types):
- **Atmospheric Element**: Environmental phenomena (light rays, particles, weather, steam, etc.)
- **Contextual Object**: Items, tools, or props that belong in this scene's world
- **Environmental Detail**: Architectural elements, natural features, spatial details
- **Related Subject**: Different character, creature, or focal point in the same world
- **Symbolic Element**: Abstract or metaphorical visuals representing the emotion/theme
- **Textural Close-up**: Extreme close-up of materials, patterns, surfaces from the environment

PROMPT STRUCTURE:
Each B-roll concept must be a complete, self-contained image generation prompt that includes:
0. **Prepend Style Lock**: Start the prompt by copying the provided style lock sentence verbatim
1. **Subject/Scene**: What to generate (the different content)
2. **Composition**: Camera angle, framing, depth of field
3. **Color Grading**: EXACT match to reference (e.g., "teal-orange blockbuster grading", "desaturated Nordic noir palette")
4. **Lighting**: EXACT match to reference's quality, direction, and atmosphere
5. **Film Grain**: EXACT match to reference (e.g., "35mm Kodak grain", "subtle digital noise", "heavy 16mm texture")
6. **Post-Processing**: EXACT match to ALL reference effects (e.g., "subtle vignette", "bloom on highlights", "chromatic aberration")
7. **Cinematographer Reference**: Explicitly mention the cinematographer's style
8. **Director Reference**: Explicitly mention the director's aesthetic
9. **Mood**: Preserve the emotional quality and energy level
10. **Technical Details**: Lens choice, cinematography approach
11. **Exclusions**: Explicitly include a clause that excludes the reference's subject and elements (e.g., "without the reference subject", "no signage/text/logos").

STYLE MATCHING IS CRITICAL:
- The generated B-roll MUST look like it was shot in the same session as the reference
- Color grading must be IDENTICAL (not similar, IDENTICAL)
- Lighting must be IDENTICAL in quality, direction, and atmosphere
- Film grain must be IDENTICAL in type and intensity
- Post-processing effects must be IDENTICAL (include ALL effects from reference)
- Mood and energy must be IDENTICAL
- Only the subject/scene and on-frame elements should be different; never repeat subjects or elements from the reference

LENGTH REQUIREMENTS:
- Each B-roll prompt: 300-400 characters (increased to accommodate technical details)
- Must be detailed and complete
- Include all essential visual elements for exact style matching

EXAMPLE (for a moody portrait reference with Deakins/Villeneuve style):
"Extreme close-up of a flickering candle flame in darkness, soft amber glow casting dancing shadows on weathered wood surface. Teal-orange blockbuster color grading with crushed blacks. Soft-diffused side lighting with warm temperature. 35mm Kodak film grain, subtle vignette, bloom on highlights. Roger Deakins cinematography style, Denis Villeneuve aesthetic. Contemplative, intimate mood with calm energy. 85mm lens, shallow depth of field. Without the reference subject."

Respond ONLY with a JSON object containing a "concepts" array of exactly 4-12 B-roll prompt strings (depending on requested count). Each string should be a complete, ready-to-use image generation prompt with EXACT style matching.

Format: { "concepts": ["prompt1", "prompt2", ...] }
`;

/**
 * B-roll concept generation result.
 */
export interface BRollConceptSet {
  /** Array of B-roll generation prompts */
  concepts: string[];
}

/**
 * Options for B-roll concept generation.
 */
export interface GenerateBRollConceptsOptions {
  /** Number of B-roll concepts to generate */
  count: number;

  /** Style and mood analysis from the reference image */
  styleAnalysis: ImageStyleMoodAnalysis;

  /** Optional user-provided context for additional guidance */
  userContext?: string;
}

/**
 * Generates B-roll concepts dynamically based on image analysis.
 *
 * Calls the API route which uses OpenAI to generate contextually relevant
 * B-roll prompts that complement the reference image.
 *
 * @param options - Generation options
 * @returns Promise resolving to B-roll concept set
 * @throws Error if generation fails
 */
export async function generateBRollConcepts(
  options: GenerateBRollConceptsOptions,
): Promise<BRollConceptSet> {
  const { count, styleAnalysis, userContext } = options;

  const fetchResult = await tryPromise(
    fetch("/api/generate-broll-concepts", {
      body: JSON.stringify({
        count,
        styleAnalysis,
        userContext,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
  );

  if (isErr(fetchResult)) {
    throw new Error(`Failed to fetch B-roll concepts: ${getErrorMessage(fetchResult)}`);
  }

  const response = fetchResult;

  if (!response.ok) {
    const errorResult = await tryPromise(response.json());
    const error = isErr(errorResult) ? null : errorResult;
    throw new Error(
      error?.error ||
        `B-roll concept generation failed with status ${response.status}`,
    );
  }

  const jsonResult = await tryPromise(response.json());
  if (isErr(jsonResult)) {
    throw new Error(`Failed to parse B-roll concepts response: ${getErrorMessage(jsonResult)}`);
  }

  return jsonResult;
}
