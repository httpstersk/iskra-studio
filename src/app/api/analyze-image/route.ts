/**
 * Image Analysis API Route
 * Analyzes images using OpenAI's vision model with advanced CLIP-based analysis
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const IMAGE_ANALYSIS_SYSTEM_PROMPT = `You're the best at analysing images using the most advanced CLIP method. Your task is to provide a comprehensive, hyper-detailed analysis of the attached image that will be used to generate HIGH-INTENSITY, FAST-PACED cinematic video prompts with rapid cuts (1 cut per second).

Analyze the image with MAXIMUM CREATIVE DETAIL across these dimensions:

1. **Subject Analysis (Extreme Detail)**:
   - Main subject: exact appearance, facial features, expression, body language, pose
   - Clothing: colors, textures, fabrics, how they might move (wind, motion)
   - Hair: style, color, how it could flow or move dynamically
   - Accessories: jewelry, props, distinctive features
   - Emotional state and attitude
   - Secondary subjects and their relationship to main subject
   - Multiple angles this subject could be captured from

2. **Color & Visual Energy**:
   - Dominant colors with specific names (not just "blue" but "electric cobalt", "sunset orange")
   - Color relationships and contrasts
   - Saturation levels and mood
   - Which colors could be emphasized for dramatic effect
   - Potential color grading directions
   - Visual textures and surface qualities

3. **Lighting Architecture**:
   - Primary light source: direction, quality (hard/soft), color temperature (warm/cool)
   - Secondary lights and fills
   - Shadow directions and characteristics
   - Highlight areas and specular reflections
   - Atmospheric lighting (volumetric, haze, god rays)
   - How lighting could change dramatically across cuts
   - Potential for colored lighting effects

4. **Environment & Space**:
   - Foreground elements in detail
   - Midground composition
   - Background layers and depth
   - Architectural or natural elements
   - Objects that could move or react (curtains, leaves, water, fabric)
   - Environmental storytelling details
   - Multiple camera positions the space allows

5. **Motion & Dynamic Potential (CRITICAL)**:
   - Explicit movements the subject could perform second-by-second
   - Camera movements each angle could support (push-in, pull-out, orbit, tilt, pan, dolly)
   - Elements that could animate (hair, fabric, particles, light, shadows)
   - Potential actions: gestures, turns, walks, jumps, expressions changing
   - Speed variations (slow motion, normal, accelerated)
   - Objects that could enter frame or exit
   - Environmental dynamics (wind, light changes, reflections)

6. **Cinematic Transformation Ideas**:
   - How this scene could EXPLODE with energy
   - Rapid angle changes that would create intensity
   - Extreme close-ups worth capturing
   - Wide reveals that would be dramatic
   - Particle effects that would enhance (confetti, light rays, sparks, smoke)
   - Time-based effects (freeze frames, speed ramps, time-lapse elements)
   - Visual effects that would amplify the mood

7. **Shot-by-Shot Potential**:
   - List 8-12 specific shot ideas with exact framing
   - Each shot should be DISTINCT and DRAMATIC
   - Mix of: extreme close-ups, medium shots, wide shots, unusual angles
   - Consider: overhead, low angle, Dutch tilt, profile, back view, POV
   - Describe what makes each shot visually arresting

Output format: Write in dense, specific, visual language. Use cinematography terms. Be EXTREMELY detailed about what you see and what could be created. Think like a music video director planning a rapid-cut sequence. Every detail you provide will directly influence the creative output.`;

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

    const result = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: IMAGE_ANALYSIS_SYSTEM_PROMPT },
            { type: "image", image: imageUrl },
          ],
        },
      ],
    });

    return NextResponse.json({
      analysis: result.text,
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
