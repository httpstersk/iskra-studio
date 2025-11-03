/**
 * Camera Angle Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with camera angles
 * Returns refined structured JSON prompts
 */

import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  cameraAngles: z.array(z.string()).min(1).max(12),
  imageUrl: z.string().url(),
  userContext: z.string().optional(),
});

/**
 * Builds camera angle refinement prompt for FIBO
 */
function buildCameraAnglePrompt(
  cameraAngle: string,
  userContext?: string
): string {
  let prompt = `Apply this camera angle: ${cameraAngle}`;

  if (userContext) {
    prompt += `Context: ${userContext}`;
  }

  return prompt;
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

    const { imageUrl, cameraAngles, userContext } = parseResult.data;

    // Build variation prompts for each camera angle
    const variations = cameraAngles.map((cameraAngle) =>
      buildCameraAnglePrompt(cameraAngle, userContext)
    );

    // Generate FIBO variations using shared service
    const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
      imageUrl,
      variations,
    });

    // Transform result to match expected API response format
    const transformedPrompts = refinedPrompts.map((item, index) => ({
      cameraAngle: cameraAngles[index],
      refinedStructuredPrompt: item.refinedStructuredPrompt,
    }));

    return NextResponse.json({
      fiboAnalysis,
      refinedPrompts: transformedPrompts,
    });
  } catch (error) {
    console.error("[Camera Angle Variations] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate camera angle variations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
