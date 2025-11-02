/**
 * Director Variations Generation API Route
 * Uses FIBO to analyze images and returns director prompt instructions
 * FIBO will handle the actual refinement during generation
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFiboImageWithRetry } from "@/lib/services/fibo-image-analyzer";

export const maxDuration = 60;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  directors: z.array(z.string()).min(1).max(12),
  userContext: z.string().optional(),
});

/**
 * Builds director refinement prompt for FIBO
 */
function buildDirectorPrompt(director: string, userContext?: string): string {
  let prompt = `Make it look as if it were shot by ${director}.`;
  
  if (userContext) {
    prompt += ` ${userContext}`;
  }
  
  return prompt;
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

    // Build director prompts for FIBO refinement
    const directorPrompts = directors.map((director) => ({
      director,
      directorPrompt: buildDirectorPrompt(director, userContext),
      structuredPrompt: fiboAnalysis,
    }));

    console.log(`[Director Variations] Created ${directorPrompts.length} director prompts`);

    return NextResponse.json({ directorPrompts, fiboAnalysis });
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
