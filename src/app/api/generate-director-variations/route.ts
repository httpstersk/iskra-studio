/**
 * Director Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with director's style
 * Returns refined structured JSON prompts
 */

import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
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

    // Build variation prompts for each director
    const variations = directors.map((director) =>
      buildDirectorPrompt(director, userContext),
    );

    // Generate FIBO variations using shared service
    const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
      imageUrl,
      variations,
    });

    // Transform result to match expected API response format
    const transformedPrompts = refinedPrompts.map((item, index) => ({
      director: directors[index],
      refinedStructuredPrompt: item.refinedStructuredPrompt,
    }));

    return NextResponse.json({
      fiboAnalysis,
      refinedPrompts: transformedPrompts,
    });
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
