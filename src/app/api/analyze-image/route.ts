/**
 * Image Analysis API Route
 * Analyzes images focusing on STYLE and MOOD using OpenAI's vision model with structured output
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { imageStyleMoodAnalysisSchema } from "@/lib/schemas/image-analysis-schema";

export const maxDuration = 30;

const IMAGE_STYLE_MOOD_PROMPT = `Analyze this image focusing EXCLUSIVELY on STYLE and MOOD - ignore specific subjects, people, poses, or actions.

Your analysis will be used to generate cinematic video storylines that match the visual style and emotional tone of this image, but with different subjects and narratives.

Focus on:

1. **Color Palette & Visual Energy**:
   - Dominant colors with specific, evocative names (e.g., "electric cobalt", "sunset amber", "toxic neon green")
   - Overall saturation and temperature
   - How colors create emotional impact

2. **Lighting Style**:
   - Quality: soft, hard, natural, artificial, dramatic
   - Direction and characteristics
   - Emotional quality and mood created by lighting
   - Atmospheric effects: haze, volumetric light, clarity

3. **Visual Aesthetic**:
   - Overall aesthetic: cinematic, editorial, surreal, minimalist, maximalist, etc.
   - Textures and surface qualities
   - Compositional approach
   - Depth perception

4. **Mood & Atmosphere**:
   - Primary emotional tone
   - Additional emotional layers
   - Energy level: calm, dynamic, explosive
   - Overall atmospheric feeling

5. **Cinematic Potential**:
   - Motion styles that would fit this aesthetic
   - Camera techniques that would enhance the mood
   - Editing pace that matches the energy
   - Visual effects that would amplify the style

6. **Narrative Tone**:
   - Cinematic genres this evokes
   - Overall intensity level
   - Storytelling approach that fits this style

DO NOT describe specific subjects, people, poses, or actions. Focus purely on the VISUAL LANGUAGE and EMOTIONAL ATMOSPHERE that could be applied to any cinematic scene.`;

interface AnalyzeImageRequest {
  imageUrl: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeImageRequest;
    const { imageUrl } = body;

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
          role: "user",
          content: [
            { type: "text", text: IMAGE_STYLE_MOOD_PROMPT },
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
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
