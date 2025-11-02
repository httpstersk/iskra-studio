/**
 * Director Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with director's style
 * Returns refined structured JSON prompts
 */

import { analyzeFiboImageWithRetry } from "@/lib/services/fibo-image-analyzer";
import { createFalClient } from "@fal-ai/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  directors: z.array(z.string()).min(1).max(12),
  imageUrl: z.string().url(),
  userContext: z.string().optional(),
});

/**
 * Builds director refinement prompt for FIBO
 */
function buildDirectorPrompt(director: string, userContext?: string): string {
  let prompt = `Make it look as though it were shot by a film director or cinematographer: ${director}.`;

  if (userContext) {
    prompt += ` ${userContext}`;
  }

  return prompt;
}

/**
 * Gets FAL API key from environment
 */
function getFalKey(): string {
  const falKey = process.env.FAL_KEY;
  if (!falKey || !falKey.trim()) {
    throw new Error("FAL_KEY environment variable is not configured");
  }
  return falKey;
}

export async function POST(req: Request) {
  try {
    const parseResult = requestSchema.safeParse(await req.json());

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { imageUrl, directors, userContext } = parseResult.data;

    const fiboAnalysis = await analyzeFiboImageWithRetry({
      imageUrl,
      seed: 666,
      timeout: 45000,
    });

    // Get FAL client
    const falKey = getFalKey();
    const falClient = createFalClient({
      credentials: () => falKey,
    });

    // Use FIBO generate to refine the structured prompt for each director
    const refinementPromises = directors.map(async (director) => {
      const directorPrompt = buildDirectorPrompt(director, userContext);

      // Call FIBO generate with original structured_prompt + director text prompt
      const result = await falClient.subscribe("bria/fibo/generate", {
        input: {
          aspect_ratio: "16:9",
          guidance_scale: 5,
          image_url: imageUrl,
          prompt: directorPrompt, // "Make it look as though it were shot by a film director or cinematographer: {director}"
          seed: 666,
          steps_num: 50,
          structured_prompt: fiboAnalysis,
          sync: false, // We only need the refined structured_prompt, not the image
        },
        logs: true,
      });

      // Extract refined structured_prompt from FIBO response
      const resultData = result.data as any;
      const refinedStructuredPrompt =
        resultData?.structured_prompt || fiboAnalysis;

      return {
        director,
        refinedStructuredPrompt,
      };
    });

    const refinedPrompts = await Promise.all(refinementPromises);

    return NextResponse.json({ refinedPrompts, fiboAnalysis });
  } catch (error) {
    console.error("[Director Variations] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate director variations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
