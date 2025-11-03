/**
 * Image Analysis API Route
 * Analyzes images focusing on STYLE and MOOD using OpenAI's vision model with structured output
 */

import { analyzeImageCore } from "@/lib/image-analyzer";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 30;

const analyzeImageRequestSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (value) => value.startsWith("https://") || value.startsWith("http://"),
      {
        message: "Image URL must use http or https",
      },
    ),
});

export async function POST(req: Request) {
  try {
    const parseResult = analyzeImageRequestSchema.safeParse(await req.json());

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { imageUrl } = parseResult.data;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 },
      );
    }

    const result = await analyzeImageCore(imageUrl);

    return NextResponse.json({
      analysis: result.analysis,
      usage: result.usage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
