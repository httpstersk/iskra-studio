/**
 * Storyline Image Generation API Route
 * 
 * Generates narrative-driven image sequences with exponential time progression.
 * Each image shows how the subject/scene evolves: +1min, +5min, +25min, +2h5m, etc.
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { imageStyleMoodAnalysisSchema } from "@/lib/schemas/image-analysis-schema";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import {
  STORYLINE_IMAGE_GENERATION_SYSTEM_PROMPT,
  buildStorylineStyleContext,
} from "@/lib/storyline-image-generator";
import {
  calculateTimeProgression,
  formatTimeLabel,
} from "@/utils/time-progression-utils";

export const maxDuration = 30;

/**
 * Schema for storyline image concept
 */
const storylineImageConceptSchema = z.object({
  prompt: z.string().describe("Complete generation prompt with style lock"),
  timeElapsed: z.number().describe("Time elapsed in minutes"),
  timeLabel: z.string().describe("Formatted time label (e.g., +1min, +2h5m)"),
  narrativeNote: z
    .string()
    .describe("Brief narrative description of story beat"),
});

/**
 * Schema for storyline concept set
 */
const storylineImageConceptSetSchema = z.object({
  concepts: z
    .array(storylineImageConceptSchema)
    .describe("Array of storyline image concepts"),
});

/**
 * Request schema
 */
const generateStorylineImagesRequestSchema = z.object({
  count: z.number().int().min(4).max(12),
  styleAnalysis: imageStyleMoodAnalysisSchema,
  userContext: z.string().optional(),
});

/**
 * Builds user prompt with style context and time progressions
 */
function buildUserPrompt(
  analysis: ImageStyleMoodAnalysis,
  count: number,
  userContext?: string
): string {
  const styleContext = buildStorylineStyleContext(analysis);
  const { subject, mood } = analysis;

  // Generate time progression sequence
  const timeSequence = Array.from({ length: count }, (_, index) => {
    const minutes = calculateTimeProgression(index);
    const label = formatTimeLabel(minutes);
    return `  - Image ${index + 1}: ${label} (${minutes} minutes)`;
  }).join("\n");

  return `
Generate ${count} storyline image concepts showing narrative progression of the reference subject over exponential time intervals.

REFERENCE SUBJECT:
- Type: ${subject.type}
- Description: ${subject.description}
- Context: ${subject.context}

TIME PROGRESSION SEQUENCE:
${timeSequence}

STYLE PARAMETERS (MUST MATCH EXACTLY):
- Style Lock: "${styleContext.styleLockPrompt}"
- Color Grading: ${styleContext.grading}
- Dominant Colors: ${styleContext.dominantColors}
- Brightness: ${styleContext.brightness}
- Contrast: ${styleContext.contrast}
- Warmth: ${styleContext.warmth}
- Saturation: ${styleContext.saturation}
- Highlight Tint: ${styleContext.highlightTint}
- Shadow Tint: ${styleContext.shadowTint}
- Key Light: ${styleContext.keyLight}
- Fill Light: ${styleContext.fillLight}
- Back Light: ${styleContext.backLight}
- Contrast Ratio: ${styleContext.contrastRatio}
- Focal Length: ${styleContext.focalLength}mm
- Aperture: ${styleContext.aperture}
- Depth of Field: ${styleContext.depthOfField}
- Lens Type: ${styleContext.lensType}
- Lens Look: ${styleContext.lensLook}
- Film Grain: ${styleContext.filmGrain} (intensity: ${styleContext.filmGrainIntensity}/100)
- Halation: ${styleContext.halation}
- Vignette: ${styleContext.vignette}
- Post-Processing: ${styleContext.postProcessingEffects}
- Cinematographer: ${styleContext.cinematographer}
- Director: ${styleContext.director}

MOOD & ATMOSPHERE:
- Primary: ${mood.primary}
- Energy: ${mood.energy}
- Atmosphere: ${mood.atmosphere}

${userContext ? `USER CONTEXT:\n${userContext}\n` : ""}

REQUIREMENTS:
1. START EVERY PROMPT with the style lock sentence
2. Show believable evolution appropriate to time elapsed
3. Maintain EXACT visual coherence (color, lighting, grain, mood)
4. Create narrative continuity (not random B-roll)
5. Follow exponential time logic (subtle → gradual → significant → major changes)

Generate ${count} storyline concepts now.
`.trim();
}

export async function POST(req: Request) {
  try {
    const parseResult = generateStorylineImagesRequestSchema.safeParse(
      await req.json()
    );

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { count, styleAnalysis, userContext } = parseResult.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const userPrompt = buildUserPrompt(styleAnalysis, count, userContext);

    const result = await generateObject({
      model: openai("gpt-5"),
      schema: storylineImageConceptSetSchema,
      messages: [
        {
          role: "system",
          content: STORYLINE_IMAGE_GENERATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    return NextResponse.json({
      concepts: result.object.concepts,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Error generating storyline images:", error);

    if (error && typeof error === "object") {
      console.error("Error details:", JSON.stringify(error, null, 2));
    }

    return NextResponse.json(
      {
        error: "Failed to generate storyline images",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
