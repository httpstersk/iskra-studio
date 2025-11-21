/**
 * Video Prompt Generator
 * Generates Sora 2 prompts from images when user doesn't provide one
 * Uses AI analysis and storyline generation
 */

import { analyzeImageCore } from "@/lib/image-analyzer";
import { expandStorylineToPrompt } from "@/lib/sora-prompt-generator";
import { generateStorylinesCore } from "@/lib/storyline-generator-core";
import { getErrorMessage, isErr } from "@/lib/errors/safe-errors";

/**
 * Generates a Sora 2 video prompt from an image URL
 * Uses AI to analyze the image and create a cinematic prompt
 *
 * @param imageUrl - Full URL of the image
 * @param duration - Video duration in seconds
 * @param userPrompt - Optional user-provided creative direction to influence the generated prompt
 * @returns Promise resolving to generated prompt
 * @throws Error if prompt generation fails or produces empty result
 */
export async function generateVideoPrompt(
  imageUrl: string,
  duration: number,
  userPrompt?: string,
): Promise<string> {
  // Validate inputs
  if (!imageUrl || !imageUrl.trim()) {
    throw new Error("Image URL is required for prompt generation");
  }

  if (!duration || duration <= 0) {
    throw new Error("Valid duration is required for prompt generation");
  }

  // Step 1: Analyze the image to get style/mood
  const analysisResult = await analyzeImageCore(imageUrl);

  if (isErr(analysisResult)) {
    throw new Error(`Image analysis failed: ${getErrorMessage(analysisResult)}`);
  }

  const { analysis: styleAnalysis } = analysisResult;

  if (!styleAnalysis) {
    throw new Error("Image analysis returned no results");
  }

  // Step 2: Generate storylines (we'll use the first one)
  const storylineSet = await generateStorylinesCore({
    styleAnalysis,
    duration,
    userPrompt,
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
    throw new Error(
      `Generated prompt is too short: ${prompt.trim().length} characters`,
    );
  }

  return prompt.trim();
}
