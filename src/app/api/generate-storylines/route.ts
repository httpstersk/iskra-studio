/**
 * Storyline Generation API Route
 * Generates dynamic storyline concepts based on style/mood analysis using AI SDK
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { createAuthenticatedHandler, requireEnv } from "@/lib/api/api-handler";
import { z } from "zod";

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { imageStyleMoodAnalysisSchema } from "@/lib/schemas/image-analysis-schema";
import { storylineSetSchema } from "@/lib/schemas/storyline-schema";
import { STORYLINE_GENERATION_SYSTEM_PROMPT } from "@/lib/storyline-generator";

export const maxDuration = 30;

const generateStorylinesRequestSchema = z.object({
  duration: z.number().int().min(1).max(60).optional(),
  styleAnalysis: imageStyleMoodAnalysisSchema,
  userPrompt: z.string().optional(),
});

/**
 * Builds a readable context string from style analysis
 */
function buildStyleContext(
  analysis: ImageStyleMoodAnalysis,
  duration: number
): string {
  const {
    subject,
    colorPalette,
    lighting,
    visualStyle,
    mood,
    cinematicPotential,
    narrativeTone,
  } = analysis;

  return `
REFERENCE IMAGE SUBJECT:
- Type: ${subject.type}
- Description: ${subject.description}
- Context: ${subject.context}

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

export const POST = createAuthenticatedHandler({
  schema: generateStorylinesRequestSchema,
  handler: async (input) => {
    const { styleAnalysis, duration, userPrompt } = input;

    // Validate API key
    requireEnv("OPENAI_API_KEY", "OpenAI API key");

    const styleContext = buildStyleContext(styleAnalysis, duration ?? 4);

    // Build user message with optional creative direction
    const userDirectionSection = userPrompt
      ? `\n\n⚠️ CRITICAL USER CREATIVE DIRECTION (MUST FOLLOW):
"${userPrompt}"

YOU MUST create storylines that directly incorporate the specific subjects, actions, and scenarios described above. This is NOT optional guidance - the storylines MUST feature:
- The exact subjects/characters mentioned
- The exact actions/events described
- The exact setting/context provided

While you MUST follow the user's creative direction for subject and narrative, you should still apply the visual style from the reference analysis (lighting, color grading, cinematography).`
      : "\n\nCreate storylines that match this style but with completely different subjects and narratives. Make each one visually explosive and emotionally compelling.";

    const result = await generateObject({
      model: openai("gpt-5-mini"),
      schema: storylineSetSchema,
      messages: [
        {
          role: "system",
          content: STORYLINE_GENERATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `
            Generate 4 unique storyline concepts for a ${duration ?? 4}-second rapid-cut video sequence.
            STYLE/MOOD ANALYSIS: ${styleContext}${userDirectionSection}
          `,
        },
      ],
    });

    return {
      storylines: result.object,
    };
  },
});
