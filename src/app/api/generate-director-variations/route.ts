/**
 * Director Variations Generation API Route
 * Combines FIBO analysis with director style refinement on the server side
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFiboImageWithRetry } from "@/lib/services/fibo-image-analyzer";

export const maxDuration = 60;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  directors: z.array(z.string()).min(1).max(12),
  userContext: z.string().optional(),
});

const DIRECTOR_REFINEMENT_SYSTEM_PROMPT = `You are a cinematography expert who transforms structured image prompts to match specific director visual signatures.

Your task: Given a FIBO structured analysis of an image and a director name, create a refined prompt that maintains the core content while applying that director's distinctive visual style.

DIRECTOR STYLE APPLICATION:
- Analyze the director's signature cinematography techniques
- Apply their color grading preferences
- Incorporate their typical lighting approaches
- Match their compositional signatures
- Preserve their characteristic mood and atmosphere

CRITICAL RULES:
1. MAINTAIN CORE CONTENT: Keep the same subject, objects, and setting
2. APPLY DIRECTOR STYLE: Infuse with director's visual signature
3. BE SPECIFIC: Use concrete cinematic terminology
4. STAY FOCUSED: One concise paragraph, no preamble
5. FORMAT: Return ONLY the refined prompt text, no explanations`;

function buildBaseFiboDescription(fiboAnalysis: any): string {
  const {
    short_description,
    background_setting,
    lighting,
    aesthetics,
    photographic_characteristics,
    style_medium,
    artistic_style,
  } = fiboAnalysis;

  return `Description: ${short_description}
Setting: ${background_setting}
Style: ${style_medium}, ${artistic_style}
Composition: ${aesthetics.composition}
Color Scheme: ${aesthetics.color_scheme}
Mood: ${aesthetics.mood_atmosphere}
Lighting: ${lighting.conditions}, ${lighting.direction}, ${lighting.shadows}
Camera: ${photographic_characteristics.camera_angle}, ${photographic_characteristics.lens_focal_length}
Depth of Field: ${photographic_characteristics.depth_of_field}
Focus: ${photographic_characteristics.focus}`;
}

export async function POST(req: Request) {
  try {
    const parseResult = requestSchema.safeParse(await req.json());

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { imageUrl, directors, userContext } = parseResult.data;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    console.log("[Director Variations] Starting FIBO analysis...");

    const fiboAnalysis = await analyzeFiboImageWithRetry({
      imageUrl,
      seed: 5555,
      timeout: 45000,
    });

    console.log("[Director Variations] FIBO analysis complete");

    const baseDescription = buildBaseFiboDescription(fiboAnalysis);

    console.log(`[Director Variations] Refining prompts for ${directors.length} directors...`);

    const refinementPromises = directors.map(async (director) => {
      const userPrompt = `FIBO ANALYSIS:\n${baseDescription}\n\nDIRECTOR: ${director}\n\nGenerate a refined prompt that makes this image look as if it were shot by ${director}.\nReturn ONLY the refined prompt text.`;

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
          { role: "system", content: DIRECTOR_REFINEMENT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      });

      return {
        director,
        refinedPrompt: result.text.trim(),
      };
    });

    const refinedPrompts = await Promise.all(refinementPromises);

    console.log(`[Director Variations] Generated ${refinedPrompts.length} refined prompts`);

    return NextResponse.json({ refinedPrompts, fiboAnalysis });
  } catch (error) {
    console.error("[Director Variations] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate director variations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
