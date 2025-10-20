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
- Saturation: choose ONLY ONE from these exact values: muted, balanced, vibrant, or hyper-saturated (no additional text)
- Temperature: choose ONLY ONE from these exact values: cool, neutral, warm, or mixed (no additional text)

LIGHTING:
- Quality: choose ONLY ONE from these exact values: soft-diffused, hard-dramatic, natural, artificial, or mixed (do not add any additional text, just the enum value)
- Direction: Describe the direction and characteristics of the light (e.g., "side lighting with backlight rim", "overhead with bounce fill")
- Mood: Describe the emotional quality and mood of the lighting
- Atmosphere: List atmospheric qualities (e.g., haze, volumetric, clear, crisp)

VISUAL STYLE:
- List aesthetic styles (e.g., cinematic, editorial, surreal, minimalist, dramatic)
- Describe the compositional approach
- Depth: choose ONLY ONE from these exact values: flat, layered, or deep-perspective (no additional text)
- Film grain: Analyze grain characteristics - none, subtle, moderate, heavy, or specific type (e.g., "35mm Kodak grain", "16mm texture", "digital noise", "Super 8 grain")
- Post-processing effects: List ALL visible effects (e.g., vignette, bloom, chromatic aberration, lens distortion, halation, light leaks, lens flares, color fringing)
- List textures present (e.g., rough, smooth, grainy, glossy)

MOOD & ATMOSPHERE:
- Primary emotional tone (one word or short phrase)
- List 2-4 secondary emotional layers
- Energy: choose ONLY ONE from these exact values: calm, moderate, dynamic, or explosive (no additional text)
- Describe the overall atmospheric feeling

STYLE SIGNATURE (precise fingerprint for exact matching):
- Aspect Ratio: choose ONLY ONE from these exact values: 1:1, 3:2, 4:3, 9:16, 16:9, 1.85:1, 2.39:1, or 21:9
- Lens Language: report all values
  - focalLengthMm (number): approximate 35mm-equivalent focal length (10-300)
  - apertureF (string): estimated aperture (e.g., f/1.8)
  - depthOfField: choose ONLY ONE: deep, medium, or shallow
  - lensType: choose ONLY ONE: anamorphic, spherical, or unknown
  - look (string): lens look characteristics (e.g., oval bokeh, barrel distortion, edge softness)
- Colorimetry: report all values
  - brightness: choose ONLY ONE: low, medium, or high
  - contrast: choose ONLY ONE: low, medium, or high
  - harmony: choose ONLY ONE: monochromatic, analogous, complementary, split-complementary, triadic, tetradic, or neutral
  - warmth: choose ONLY ONE: cool, neutral, warm, or mixed
  - highlightTint (string): highlight color cast
  - shadowTint (string): shadow color cast
  - saturation: choose ONLY ONE: muted, balanced, vibrant, or hyper-saturated
- Lighting Signature: report all values
  - key (string): key light characteristics
  - fill (string): fill light characteristics
  - back (string): back/rim light characteristics
  - contrastRatio: choose ONLY ONE: high-key, mid-key, low-key, or unknown
- Post-Processing Signature: report all values
  - filmGrainIntensity (0-100): numeric grain/noise intensity
  - halation (boolean): presence of halation/glow
  - vignette: choose ONLY ONE: none, subtle, moderate, or heavy
- Rhythm: report all values
  - cadence (string): perceived cadence/pacing
  - tempo: choose ONLY ONE: still, slow, measured, brisk, or frantic
- styleLockPrompt (string): one concise sentence that locks color, lighting, lens, grain, and emotion for prompts (to prepend to prompts)

CINEMATIC POTENTIAL:
- List AT LEAST TWO motion styles that fit (e.g., smooth, frenetic, slow, rhythmic)
- List AT LEAST TWO camera techniques (e.g., push-in, orbit, tilt, dolly, pan)
- List AT LEAST TWO visual effects that would amplify the mood (e.g., light streaks, particles, bloom)
- Editing pace: choose ONLY ONE from these exact values: slow-contemplative, measured, fast-cuts, or rapid-fire (no additional text)

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
      model: openai("gpt-5"),
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
