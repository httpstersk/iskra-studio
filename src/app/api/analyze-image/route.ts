/**
 * Image Analysis API Route
 * Analyzes images focusing on STYLE and MOOD using OpenAI's vision model with structured output
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { imageStyleMoodAnalysisSchema } from "@/lib/schemas/image-analysis-schema";

export const maxDuration = 30;

const IMAGE_STYLE_MOOD_PROMPT = `You are analyzing an image to extract structured data for cinematic video generation.

Provide a detailed analysis in the following categories. Be specific and creative with descriptive language. When lists are requested, ALWAYS supply at least the minimum number of items indicated.

SUBJECT/SCENE:
- Identify the main subject type (person, object, landscape, cityscape, abstract, nature, architecture, etc.)
- Describe what you see in 1-2 sentences
- Describe the general context or what's happening (e.g., "in contemplation", "in motion", "at rest")

COLOR PALETTE:
- List 3-5 dominant colors with evocative names (e.g., "midnight indigo", "electric cobalt", "sunset amber")
- Provide detailed color grading description (e.g., "teal-orange blockbuster look", "desaturated Nordic noir palette", "warm golden hour glow with crushed blacks")
- Describe the overall mood the colors create
- Specify saturation level: muted, balanced, vibrant, or hyper-saturated
- Specify temperature: cool, neutral, warm, or mixed

LIGHTING:
- Quality: choose from soft-diffused, hard-dramatic, natural, artificial, or mixed
- Describe the direction and characteristics of the light
- Describe the emotional quality and mood of the lighting
- List atmospheric qualities (e.g., haze, volumetric, clear, crisp)

VISUAL STYLE:
- List aesthetic styles (e.g., cinematic, editorial, surreal, minimalist, dramatic)
- List textures present (e.g., rough, smooth, grainy, glossy)
- Describe the compositional approach
- Depth: choose from flat, layered, or deep-perspective

MOOD & ATMOSPHERE:
- Primary emotional tone (one word or short phrase)
- List 2-4 secondary emotional layers
- Energy level: choose from calm, moderate, dynamic, or explosive
- Describe the overall atmospheric feeling

CINEMATIC POTENTIAL:
- List AT LEAST TWO motion styles that fit (e.g., smooth, frenetic, slow, rhythmic)
- List AT LEAST TWO camera techniques (e.g., push-in, orbit, tilt, dolly, pan)
- Editing pace: choose from slow-contemplative, measured, fast-cuts, or rapid-fire
- List AT LEAST TWO visual effects that would amplify the mood (e.g., light streaks, particles, bloom)

NARRATIVE TONE:
- Identify which cinematographer's style this most resembles (e.g., Roger Deakins, Emmanuel Lubezki, Hoyte van Hoytema, Vittorio Storaro, Bradford Young)
- Identify which director's visual aesthetic this evokes (e.g., Denis Villeneuve, Wes Anderson, Christopher Nolan, Wong Kar-wai, Terrence Malick)
- List 2-4 cinematic genres this evokes (e.g., thriller, fashion, experimental, noir, drama)
- Intensity level: number from 1 to 10
- Describe the storytelling approach

Focus on visual language, style, and mood that can inspire cinematic video sequences. The cinematographer and director references will be used to guide B-roll generation that matches this exact aesthetic.`;

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
      }
    ),
});

export async function POST(req: Request) {
  try {
    const parseResult = analyzeImageRequestSchema.safeParse(await req.json());

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { imageUrl } = parseResult.data;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const result = await generateObject({
      model: openai("gpt-5-mini"),
      schema: imageStyleMoodAnalysisSchema,
      messages: [
        {
          role: "system",
          content: IMAGE_STYLE_MOOD_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image according to the structured format.",
            },
            { type: "image", image: imageUrl },
          ],
        },
      ],
    });

    return NextResponse.json({
      analysis: result.object,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);

    // Log detailed error for debugging
    if (error && typeof error === "object") {
      console.error("Error details:", JSON.stringify(error, null, 2));
    }

    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
