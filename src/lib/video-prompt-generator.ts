/**
 * Video Prompt Generator
 * Generates Sora 2 prompts from images when user doesn't provide one
 * Uses AI analysis and storyline generation
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { expandStorylineToPrompt } from "@/lib/sora-prompt-generator";
import { generateStorylines } from "@/lib/storyline-generator";

/**
 * Analyzes an image using OpenAI's vision model
 * @param imageUrl - Full URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis
 */
async function analyzeImage(imageUrl: string): Promise<ImageStyleMoodAnalysis> {
  const response = await fetch("/api/analyze-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `Image analysis failed with status ${response.status}`
    );
  }

  const result = await response.json();
  return result.analysis;
}

/**
 * Generates a Sora 2 video prompt from an image URL
 * Uses AI to analyze the image and create a cinematic prompt
 * 
 * @param imageUrl - Full URL of the image
 * @param duration - Video duration in seconds
 * @returns Promise resolving to generated prompt
 * @throws Error if prompt generation fails or produces empty result
 */
export async function generateVideoPrompt(
  imageUrl: string,
  duration: number
): Promise<string> {
  // Validate inputs
  if (!imageUrl || !imageUrl.trim()) {
    throw new Error("Image URL is required for prompt generation");
  }
  
  if (!duration || duration <= 0) {
    throw new Error("Valid duration is required for prompt generation");
  }

  // Step 1: Analyze the image to get style/mood
  const styleAnalysis = await analyzeImage(imageUrl);
  
  if (!styleAnalysis) {
    throw new Error("Image analysis returned no results");
  }

  // Step 2: Generate storylines (we'll use the first one)
  const storylineSet = await generateStorylines({
    styleAnalysis,
    duration,
  });

  if (!storylineSet.storylines || storylineSet.storylines.length === 0) {
    throw new Error("No storylines generated from image analysis");
  }

  // Step 3: Expand the first storyline into a full Sora prompt
  const prompt = expandStorylineToPrompt({
    storyline: storylineSet.storylines[0],
    styleAnalysis,
    duration,
  });
  
  // Validate the generated prompt
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Generated prompt is empty or invalid");
  }
  
  // Ensure minimum prompt length for quality
  if (prompt.trim().length < 10) {
    throw new Error(`Generated prompt is too short: ${prompt.trim().length} characters`);
  }

  return prompt.trim();
}
