/**
 * Storyline Generation Service
 * Pure business logic for generating storyline image sequences
 * Separated from React state management for testability and reusability
 *
 * @module features/generation/app-services/storyline-generation
 */

import { config } from "@/shared/config/runtime";
import { logger } from "@/shared/logging/logger";
import { ImageAnalysisError, ImageGenerationError } from "@/shared/errors";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { generateStorylineImageConcepts } from "@/lib/storyline-image-generator";

const serviceLogger = logger.child({ service: "storyline-generation" });

/**
 * Result of image style analysis
 */
export interface ImageAnalysisResult {
  analysis: ImageStyleMoodAnalysis;
}

/**
 * Storyline concept with narrative metadata
 */
export interface StorylineConcept {
  prompt: string;
  narrativeNote: string;
  timeLabel: string;
}

/**
 * Parameters for storyline generation
 */
export interface StorylineGenerationParams {
  count: number;
  imageUrl: string;
  userContext?: string;
}

/**
 * Analyzes an image using OpenAI's vision model.
 */
export async function analyzeImageStyle(
  imageUrl: string,
): Promise<ImageAnalysisResult> {
  try {
    serviceLogger.info("Analyzing image style", { imageUrl });

    const response = await fetch(config.api.analyzeImage, {
      body: JSON.stringify({ imageUrl }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new ImageAnalysisError(
        error?.error || `Image analysis failed with status ${response.status}`,
        { imageUrl, statusCode: response.status },
      );
    }

    const result = await response.json();
    serviceLogger.info("Image analysis completed");

    return { analysis: result.analysis };
  } catch (error) {
    if (error instanceof ImageAnalysisError) throw error;

    serviceLogger.error("Image analysis failed", error as Error, { imageUrl });
    throw new ImageAnalysisError(
      error instanceof Error ? error.message : "Unknown error during analysis",
      { imageUrl },
    );
  }
}

/**
 * Generates storyline concepts with exponential time progression.
 */
export async function generateStorylineConcepts(
  params: StorylineGenerationParams,
): Promise<StorylineConcept[]> {
  try {
    serviceLogger.info("Generating storyline concepts", {
      count: params.count,
      hasUserContext: !!params.userContext,
    });

    const { analysis } = await analyzeImageStyle(params.imageUrl);

    const storylineConcepts = await generateStorylineImageConcepts({
      count: params.count,
      styleAnalysis: analysis,
      userContext: params.userContext,
    });

    serviceLogger.info("Storyline concepts generated", {
      conceptCount: storylineConcepts.concepts.length,
    });

    return storylineConcepts.concepts.map((c) => ({
      prompt: c.prompt,
      narrativeNote: c.narrativeNote,
      timeLabel: c.timeLabel,
    }));
  } catch (error) {
    if (
      error instanceof ImageAnalysisError ||
      error instanceof ImageGenerationError
    ) {
      throw error;
    }

    serviceLogger.error("Storyline concept generation failed", error as Error, {
      params,
    });
    throw new ImageGenerationError(
      error instanceof Error
        ? error.message
        : "Unknown error during storyline generation",
      { params },
    );
  }
}
