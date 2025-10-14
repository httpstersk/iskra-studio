/**
 * Storyline Generation API Route
 * Generates dynamic storyline concepts based on style/mood analysis using AI SDK
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { storylineSetSchema } from "@/lib/schemas/storyline-schema";
import { imageStyleMoodAnalysisSchema } from "@/lib/schemas/image-analysis-schema";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { STORYLINE_GENERATION_SYSTEM_PROMPT } from "@/lib/storyline-generator";

export const maxDuration = 30;

const generateStorylinesRequestSchema = z.object({
  styleAnalysis: imageStyleMoodAnalysisSchema,
  duration: z.number().int().min(1).max(60).optional(),
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

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const normalizedBody = {
      styleAnalysis: rawBody?.styleAnalysis,
      duration:
        rawBody?.duration === undefined
          ? undefined
          : typeof rawBody.duration === "string"
            ? Number.parseInt(rawBody.duration, 10)
            : rawBody.duration,
    } satisfies Partial<Record<string, unknown>>;

    const parseResult =
      generateStorylinesRequestSchema.safeParse(normalizedBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { styleAnalysis, duration } = parseResult.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const styleContext = buildStyleContext(styleAnalysis, duration ?? 4);

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
          content: `Generate 4 unique storyline concepts for a ${duration ?? 4}-second rapid-cut video sequence.

STYLE/MOOD ANALYSIS:
${styleContext}

Create storylines that match this style but with completely different subjects and narratives. Make each one visually explosive and emotionally compelling.`,
        },
      ],
    });

    return NextResponse.json({
      storylines: result.object,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Error generating storylines:", error);
    return NextResponse.json(
      {
        error: "Failed to generate storylines",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
