/**
 * Storyline Generation Service
 * Pure business logic for generating storyline image sequences
 * Separated from React state management for testability and reusability
 *
 * @module features/generation/app-services/storyline-generation
 */

import { config } from "@/shared/config/runtime";
import { createLogger } from "@/lib/logger";
import { ImageAnalysisError, ImageGenerationError } from "@/shared/errors";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { generateStorylineImageConcepts } from "@/lib/storyline-image-generator";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

const serviceLogger = createLogger("storyline-generation");

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

    const fetchResult = await tryPromise(
      fetch(config.api.analyzeImage, {
        body: JSON.stringify({ imageUrl }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );

    if (isErr(fetchResult)) {
      throw new ImageAnalysisError(
        `Failed to fetch image analysis: ${getErrorMessage(fetchResult)}`,
        { imageUrl },
      );
    }

    const response = fetchResult;

    if (!response.ok) {
      const errorResult = await tryPromise(response.json());
      const error = isErr(errorResult) ? null : errorResult;
      throw new ImageAnalysisError(
        error?.error || `Image analysis failed with status ${response.status}`,
        { imageUrl, statusCode: response.status },
      );
    }

    const jsonResult = await tryPromise(response.json());
    if (isErr(jsonResult)) {
      throw new ImageAnalysisError(
        `Failed to parse analysis response: ${getErrorMessage(jsonResult)}`,
        { imageUrl },
      );
    }

    const result = jsonResult;
    serviceLogger.info("Image analysis completed");

    return { analysis: result.analysis };
  } catch (error) {
    if (error instanceof ImageAnalysisError) throw error;

    serviceLogger.error("Image analysis failed", { error, imageUrl });
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

    serviceLogger.error("Storyline concept generation failed", { error, params });
    throw new ImageGenerationError(
      error instanceof Error
        ? error.message
        : "Unknown error during storyline generation",
      { params },
    );
  }
}
