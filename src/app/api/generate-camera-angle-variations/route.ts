/**
 * Camera Angle Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with camera angles
 * Returns refined structured JSON prompts
 */

import { analyzeFiboImageWithRetry } from "@/lib/services/fibo-image-analyzer";
import { createFalClient } from "@fal-ai/client";
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
  userContext?: string,
): string {
  let prompt = `Apply this camera angle: ${cameraAngle}`;

  if (userContext) {
    prompt += `Context: ${userContext}`;
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
        { status: 400 },
      );
    }

    const { imageUrl, cameraAngles, userContext } = parseResult.data;

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

    // Use FIBO generate to refine the structured prompt for each camera angle
    const refinementPromises = cameraAngles.map(async (cameraAngle) => {
      const cameraPrompt = buildCameraAnglePrompt(cameraAngle, userContext);

      // Call FIBO generate with original structured_prompt + camera angle text prompt
      const result = await falClient.subscribe("bria/fibo/generate", {
        input: {
          aspect_ratio: "16:9",
          guidance_scale: 5,
          image_url: imageUrl,
          prompt: cameraPrompt, // "Apply this camera angle: {cameraAngle}"
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
        cameraAngle,
        refinedStructuredPrompt,
      };
    });

    const refinedPrompts = await Promise.all(refinementPromises);

    return NextResponse.json({ refinedPrompts, fiboAnalysis });
  } catch (error) {
    console.error("[Camera Angle Variations] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate camera angle variations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
