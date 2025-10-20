/**
 * B-roll Concept Generator
 *
 * Dynamically generates contextually relevant B-roll concepts based on
 * image analysis, similar to how Sora 2 generates video storylines.
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";

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

Your mission: Generate CONTEXTUALLY RELEVANT B-ROLL CONCEPTS that complement the reference image.

CRITICAL REQUIREMENTS:
1. **DIFFERENT CONTENT**: Generate completely different scenes, objects, or subjects than the reference
2. **CONTEXTUAL RELEVANCE**: Each B-roll must logically belong in the same world/narrative as the reference
3. **EXACT STYLE MATCHING**: Replicate the reference's aesthetic with precision:
   - Match the EXACT color grading (e.g., teal-orange, desaturated, warm glow)
   - Match the EXACT lighting quality and direction
   - Match the EXACT atmospheric qualities (haze, clarity, volumetric effects)
   - Match the EXACT mood and energy level
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
1. **Subject/Scene**: What to generate (the different content)
2. **Composition**: Camera angle, framing, depth of field
3. **Color Grading**: EXACT match to reference (e.g., "teal-orange blockbuster grading", "desaturated Nordic noir palette")
4. **Lighting**: EXACT match to reference's quality, direction, and atmosphere
5. **Cinematographer Reference**: Explicitly mention the cinematographer's style
6. **Director Reference**: Explicitly mention the director's aesthetic
7. **Mood**: Preserve the emotional quality and energy level
8. **Technical Details**: Lens choice, cinematography approach

STYLE MATCHING IS CRITICAL:
- The generated B-roll MUST look like it was shot in the same session as the reference
- Color grading must be IDENTICAL (not similar, IDENTICAL)
- Lighting must be IDENTICAL in quality, direction, and atmosphere
- Mood and energy must be IDENTICAL
- Only the subject/scene should be different

LENGTH REQUIREMENTS:
- Each B-roll prompt: 250-350 characters
- Must be detailed and complete
- Include all essential visual elements for exact style matching

EXAMPLE (for a moody portrait reference with Deakins/Villeneuve style):
"Extreme close-up of a flickering candle flame in darkness, soft amber glow casting dancing shadows on weathered wood surface. Teal-orange blockbuster color grading with crushed blacks. Soft-diffused side lighting with warm temperature. Roger Deakins cinematography style, Denis Villeneuve aesthetic. Contemplative, intimate mood with calm energy. 85mm lens, shallow depth of field, cinematic texture."

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
  options: GenerateBRollConceptsOptions
): Promise<BRollConceptSet> {
  const { count, styleAnalysis, userContext } = options;

  const response = await fetch("/api/generate-broll-concepts", {
    body: JSON.stringify({
      count,
      styleAnalysis,
      userContext,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `B-roll concept generation failed with status ${response.status}`
    );
  }

  const result = await response.json();
  return result;
}
