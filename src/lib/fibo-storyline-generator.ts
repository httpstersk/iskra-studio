/**
 * FIBO-Based Storyline Generator
 *
 * Generates narrative progressions using FIBO's structured aesthetics directly.
 * No inference or mapping - uses FIBO's native output for style consistency.
 */

import type {
  FiboAnalysis,
  FiboStorylineImageConcept,
} from "@/lib/schemas/fibo-storyline-schema";
import {
  calculateTimeProgression,
  formatTimeLabel,
} from "@/utils/time-progression-utils";

/**
 * System prompt for FIBO-based storyline generation
 */
export const FIBO_STORYLINE_SYSTEM_PROMPT = `
You are a master visual storyteller creating narrative progressions using precise FIBO aesthetic specifications.

Your mission: Generate storyline shots showing how a story WORLD evolves over exponential time jumps,
while maintaining EXACT visual aesthetics from the reference analysis.

CRITICAL RULES:

1. **CONTENT EXCLUSION** (ABSOLUTE PRIORITY):
   - NEVER include subjects/people/characters from the reference
   - NEVER show the same objects, props, or items
   - NEVER use the same location or setting
   - Think "What ELSE is happening in this story world?"

2. **AESTHETIC PRESERVATION** (EXACT MATCHING):
   You will receive FIBO analysis with precise aesthetic specifications.
   EVERY generated image MUST maintain these EXACTLY:
   
   - **Composition**: Match the compositional approach exactly
   - **Color Scheme**: Replicate color palette and grading precisely
   - **Mood & Atmosphere**: Preserve emotional tone and atmospheric qualities
   - **Lighting**: Match conditions, direction, and shadow characteristics
   - **Camera/Lens**: Maintain depth of field, focus style, angle, focal length
   - **Style Medium**: Keep the same medium/format
   - **Artistic Style**: Preserve artistic approach and treatment

3. **TIME PROGRESSION LOGIC**:
   - +1min: Immediate consequence/related element (NOT the subject)
   - +5min: Connected location/event showing story expansion
   - +25min: Story world depth - other places/effects
   - +2h+: Long-term transformation of the story world

4. **PROMPT STRUCTURE**:
   Build each prompt by embedding ALL FIBO aesthetic specifications:
   
   "[Story element at +{time}]. [What's happening - NO reference subjects]. 
   Style: {style_medium} in {artistic_style} style. 
   Composition: {composition}. 
   Color: {color_scheme}. 
   Mood: {mood_atmosphere}. 
   Lighting: {lighting_conditions}, {lighting_direction}, {lighting_shadows}. 
   Camera: {camera_angle}, {lens_focal_length}, {depth_of_field}, {focus}."

EXAMPLES (showing proper FIBO aesthetic embedding):

Reference FIBO Analysis:
- style_medium: "photograph"
- artistic_style: "minimalist, dramatic, chiaroscuro"  
- composition: "centered, symmetrical, portrait composition"
- color_scheme: "high contrast between dark greys/blacks and warm orange"
- mood_atmosphere: "mysterious, contemplative, stark, minimalist"
- lighting conditions: "dim indoor"
- lighting direction: "backlit from doorway"
- lighting shadows: "strong silhouette with deep shadow"
- camera_angle: "eye-level"
- lens_focal_length: "35mm-50mm standard lens"
- depth_of_field: "deep"
- focus: "sharp focus on subject and immediate surroundings"

Generated Storyline (+1min):
"Empty doorway with warm orange light spilling through, no figure present, suggesting recent departure. Style: photograph in minimalist, dramatic, chiaroscuro style. Composition: centered, symmetrical, portrait composition. Color: high contrast between dark greys/blacks and warm orange. Mood: mysterious, contemplative, stark, minimalist. Lighting: dim indoor, backlit from doorway creating strong shadows with warm glow. Camera: eye-level, 35mm-50mm standard lens, deep depth of field, sharp focus on doorway and walls."

Generated Storyline (+5min):
"Dark corridor with circular object mounted on wall, warm light visible at far end, textured walls catching rim lighting. Style: photograph in minimalist, dramatic, chiaroscuro style. Composition: centered, symmetrical, portrait composition. Color: high contrast between dark greys/blacks and warm orange glow. Mood: mysterious, contemplative, stark, minimalist. Lighting: dim indoor, backlit from distant source creating dramatic shadows. Camera: eye-level, 35mm-50mm standard lens, deep depth of field, sharp focus throughout corridor."

RESPONSE FORMAT:
Return ONLY valid JSON:
{
  "concepts": [
    {
      "prompt": "Complete prompt with all FIBO aesthetics embedded",
      "timeElapsed": 1,
      "timeLabel": "+1min",
      "narrativeNote": "What's happening in the story world at this time",
      "aesthetics": {
        "composition": "copied from reference",
        "color_scheme": "copied from reference",
        "mood_atmosphere": "copied from reference"
      },
      "lighting": {
        "conditions": "copied from reference",
        "direction": "copied from reference", 
        "shadows": "copied from reference"
      },
      "photographic_characteristics": {
        "depth_of_field": "copied from reference",
        "focus": "copied from reference",
        "camera_angle": "copied from reference",
        "lens_focal_length": "copied from reference"
      },
      "style_medium": "copied from reference",
      "artistic_style": "copied from reference"
    }
  ]
}
`;

/**
 * Builds user prompt with FIBO analysis and time progressions
 */
export function buildFiboStorylinePrompt(
  fiboAnalysis: FiboAnalysis,
  count: number,
  userContext?: string,
): string {
  const {
    short_description,
    objects,
    background_setting,
    lighting,
    aesthetics,
    photographic_characteristics,
    style_medium,
    context,
    artistic_style,
  } = fiboAnalysis;

  // Generate time progression sequence
  const timeSequence = Array.from({ length: count }, (_, index) => {
    const minutes = calculateTimeProgression(index);
    const label = formatTimeLabel(minutes);
    return `  - Image ${index + 1}: ${label} (${minutes} minutes elapsed)`;
  }).join("\n");

  // Extract primary subject for context (but EXCLUDE from generation)
  const primaryObject = objects[0] || { description: "scene" };

  return `
Generate ${count} storyline image concepts with exponential time progression.

REFERENCE ANALYSIS (for aesthetic matching ONLY - EXCLUDE all content):

Description: ${short_description}
Context: ${context}
Background: ${background_setting}

Primary Subject (DO NOT INCLUDE): ${primaryObject.description}
Objects Present (DO NOT INCLUDE): ${objects.map((obj) => obj.description).join(", ")}

AESTHETIC SPECIFICATIONS TO MATCH EXACTLY:

Style Medium: ${style_medium}
Artistic Style: ${artistic_style}

Composition:
- Approach: ${aesthetics.composition}

Color & Mood:
- Color Scheme: ${aesthetics.color_scheme}
- Mood/Atmosphere: ${aesthetics.mood_atmosphere}
${aesthetics.aesthetic_score ? `- Aesthetic Score: ${aesthetics.aesthetic_score}` : ""}
${aesthetics.preference_score ? `- Preference Score: ${aesthetics.preference_score}` : ""}

Lighting:
- Conditions: ${lighting.conditions}
- Direction: ${lighting.direction}
- Shadows: ${lighting.shadows}

Camera/Lens:
- Angle: ${photographic_characteristics.camera_angle}
- Focal Length: ${photographic_characteristics.lens_focal_length}
- Depth of Field: ${photographic_characteristics.depth_of_field}
- Focus: ${photographic_characteristics.focus}

TIME PROGRESSION SEQUENCE:
${timeSequence}

${userContext ? `USER CONTEXT:\n${userContext}\n` : ""}

CRITICAL REQUIREMENTS:
1. EXCLUDE ALL REFERENCE CONTENT: No subjects, objects, or locations from reference
2. PRESERVE ALL AESTHETICS: Match every specification exactly
3. SHOW STORY WORLD EVOLUTION: What else is happening at each time point
4. EMBED FULL AESTHETICS: Include all specifications in each prompt

Generate ${count} concepts showing how the story WORLD evolves (NOT the reference subject).
`.trim();
}

/**
 * Generates FIBO-based storyline image concepts
 *
 * @param fiboAnalysis - FIBO structured analysis of reference image
 * @param count - Number of storyline images to generate (4-12)
 * @param userContext - Optional user-provided narrative context
 * @returns Promise resolving to storyline concept set
 */
export async function generateFiboStorylineConcepts(
  fiboAnalysis: FiboAnalysis,
  count: number,
  userContext?: string,
): Promise<{ concepts: FiboStorylineImageConcept[] }> {
  const response = await fetch("/api/generate-fibo-storylines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fiboAnalysis,
      count,
      userContext,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `FIBO storyline generation failed with status ${response.status}`,
    );
  }

  return response.json();
}
