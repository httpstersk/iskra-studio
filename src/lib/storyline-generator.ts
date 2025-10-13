/**
 * Storyline Generator Client
 * Client-side wrapper that calls the storyline generation API
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { StorylineSet } from "@/lib/schemas/storyline-schema";

interface GenerateStorylinesOptions {
  styleAnalysis: ImageStyleMoodAnalysis;
  duration: number;
}

/**
 * Generates 4 unique storyline concepts based on style/mood analysis
 * Calls the API route which has access to OpenAI API key
 */
export async function generateStorylines(
  options: GenerateStorylinesOptions
): Promise<StorylineSet> {
  const { styleAnalysis, duration } = options;

  const response = await fetch("/api/generate-storylines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      styleAnalysis,
      duration,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error || `Storyline generation failed with status ${response.status}`
    );
  }

  const result = await response.json();
  return result.storylines;
}
