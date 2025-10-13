/**
 * Storyline Generator
 * Generates dynamic storyline concepts based on image style/mood analysis
 * Uses AI SDK to create unique narratives at runtime
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import {
  storylineSetSchema,
  type StorylineSet,
} from "@/lib/schemas/storyline-schema";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

const STORYLINE_GENERATION_PROMPT = `
You are a visionary cinematographer and storytelling director creating HIGH-INTENSITY video concepts.

Based on the provided style/mood analysis, generate 4 DISTINCT storyline concepts that match the visual aesthetic and emotional tone, but with completely different subjects and narratives.

CRITICAL REQUIREMENTS:
1. Each storyline must be UNIQUE with different subjects, settings, and narratives
2. All storylines must match the analyzed style/mood (colors, lighting, energy, atmosphere)
3. Design for RAPID-CUT cinematography with 1 cut per second
4. Each storyline should escalate in intensity
5. Focus on visual storytelling - every moment must be visually striking
6. Vary the genres: experimental, fashion, action, artistic, abstract, etc.

INSPIRATION FOR VARIETY:
- Urban action: warriors, dancers, athletes in motion
- Fashion/editorial: models, designers, style icons
- Artistic: painters, sculptors, creators at work
- Experimental: abstract figures, surreal characters, dream sequences
- Nature: elemental forces, transformation, metamorphosis
- Technology: cyber beings, digital avatars, future humans

Each storyline should:
- Have a clear subject/character type
- Take place in a specific environment
- Include a brief narrative arc (what happens)
- List visual motifs that repeat throughout
- Describe the emotional progression
- Define key pivotal moments for the sequence

Make each storyline feel like a complete mini-film concept that could be shot in 4-10 seconds with rapid cuts.
`;

interface GenerateStorylinesOptions {
  styleAnalysis: ImageStyleMoodAnalysis;
  duration: number;
}

/**
 * Generates 4 unique storyline concepts based on style/mood analysis
 */
export async function generateStorylines(
  options: GenerateStorylinesOptions
): Promise<StorylineSet> {
  const { styleAnalysis, duration } = options;

  // Build context about the style
  const styleContext = buildStyleContext(styleAnalysis, duration);

  const result = await generateObject({
    model: openai("gpt-5"),
    schema: storylineSetSchema,
    messages: [
      {
        role: "system",
        content: STORYLINE_GENERATION_PROMPT,
      },
      {
        role: "user",
        content: `Generate 4 unique storyline concepts for a ${duration}-second rapid-cut video sequence.

STYLE/MOOD ANALYSIS:
${styleContext}

Create storylines that match this style but with completely different subjects and narratives. Make each one visually explosive and emotionally compelling.`,
      },
    ],
  });

  return result.object;
}

/**
 * Builds a readable context string from style analysis
 */
function buildStyleContext(
  analysis: ImageStyleMoodAnalysis,
  duration: number
): string {
  const {
    colorPalette,
    lighting,
    visualStyle,
    mood,
    cinematicPotential,
    narrativeTone,
  } = analysis;

  return `
COLOR PALETTE:
- Dominant colors: ${colorPalette.dominant.join(", ")}
- Mood: ${colorPalette.mood}
- Saturation: ${colorPalette.saturation}
- Temperature: ${colorPalette.temperature}

LIGHTING:
- Quality: ${lighting.quality}
- Direction: ${lighting.direction}
- Mood: ${lighting.mood}
- Atmosphere: ${lighting.atmosphere.join(", ")}

VISUAL STYLE:
- Aesthetic: ${visualStyle.aesthetic.join(", ")}
- Texture: ${visualStyle.texture.join(", ")}
- Composition: ${visualStyle.composition}
- Depth: ${visualStyle.depth}

MOOD & ATMOSPHERE:
- Primary emotion: ${mood.primary}
- Secondary emotions: ${mood.secondary.join(", ")}
- Energy level: ${mood.energy}
- Atmosphere: ${mood.atmosphere}

CINEMATIC POTENTIAL:
- Motion styles: ${cinematicPotential.motionStyle.join(", ")}
- Camera techniques: ${cinematicPotential.camerawork.join(", ")}
- Editing pace: ${cinematicPotential.editingPace}
- Visual effects: ${cinematicPotential.visualEffects.join(", ")}

NARRATIVE TONE:
- Genres: ${narrativeTone.genre.join(", ")}
- Intensity: ${narrativeTone.intensity}/10
- Storytelling approach: ${narrativeTone.storytellingApproach}

DURATION: ${duration} seconds (${duration} rapid cuts at 1 cut per second)
`.trim();
}
