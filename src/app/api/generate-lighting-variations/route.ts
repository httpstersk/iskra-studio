/**
 * Lighting Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with lighting scenarios
 * Returns refined structured JSON prompts
 */

import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  lightingScenarios: z.array(z.string()).min(1).max(12),
  userContext: z.string().optional(),
});

/**
 * Builds lighting scenario refinement prompt for FIBO
 */
function buildLightingPrompt(
  lightingScenario: string,
  userContext?: string,
): string {
  let prompt = `Apply this lighting: ${lightingScenario}`;

  if (userContext) {
    prompt += `\n\nContext: ${userContext}`;
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

    const { imageUrl, lightingScenarios, userContext } = parseResult.data;

    // Build variation prompts for each lighting scenario
    const variations = lightingScenarios.map((lightingScenario) =>
      buildLightingPrompt(lightingScenario, userContext),
    );

    // Generate FIBO variations using shared service
    const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
      imageUrl,
      variations,
    });

    // Transform result to match expected API response format
    const transformedPrompts = refinedPrompts.map((item, index) => ({
      lightingScenario: lightingScenarios[index],
      refinedStructuredPrompt: item.refinedStructuredPrompt,
    }));

    return NextResponse.json({
      fiboAnalysis,
      refinedPrompts: transformedPrompts,
    });
  } catch (error) {
    console.error("[Lighting Variations] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate lighting variations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
