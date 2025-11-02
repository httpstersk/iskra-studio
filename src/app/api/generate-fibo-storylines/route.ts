/**
 * FIBO Storyline Generation API Route
 *
 * Generates narrative-driven image sequences using FIBO's structured aesthetics.
 * Each image maintains exact FIBO aesthetic specifications while showing
 * different elements of the story world at exponentially progressing times.
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  fiboAnalysisSchema,
  fiboStorylineConceptSetSchema,
  type FiboAnalysis,
} from "@/lib/schemas/fibo-storyline-schema";
import {
  FIBO_STORYLINE_SYSTEM_PROMPT,
  buildFiboStorylinePrompt,
} from "@/lib/fibo-storyline-generator";

export const maxDuration = 30;

/**
 * Request schema
 */
const generateFiboStorylinesRequestSchema = z.object({
  fiboAnalysis: fiboAnalysisSchema,
  count: z.number().int().min(4).max(12),
  userContext: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const parseResult = generateFiboStorylinesRequestSchema.safeParse(
      await req.json(),
    );

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { fiboAnalysis, count, userContext } = parseResult.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    // Build user prompt with FIBO aesthetics
    const userPrompt = buildFiboStorylinePrompt(
      fiboAnalysis,
      count,
      userContext,
    );

    console.log("[FIBO Storyline] Generating concepts with FIBO aesthetics...");

    // Generate storyline concepts
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: fiboStorylineConceptSetSchema.pick({ concepts: true }),
      messages: [
        {
          role: "system",
          content: FIBO_STORYLINE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.8,
    });

    console.log(
      `[FIBO Storyline] Generated ${result.object.concepts.length} concepts`,
    );

    return NextResponse.json({
      concepts: result.object.concepts,
      usage: result.usage,
    });
  } catch (error) {
    console.error("[FIBO Storyline] Generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate FIBO storylines",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
