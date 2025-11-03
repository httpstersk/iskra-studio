/**
 * Shared Image Analysis Logic
 * Can be called directly from server-side code without HTTP requests
 *
 * Now powered by Bria FIBO model for faster, more accurate image analysis
 */

import { FIBO_ANALYSIS } from "@/constants/fibo";
import { adaptFiboToAnalysis } from "@/lib/adapters/fibo-to-analysis-adapter";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import {
  analyzeFiboImageWithRetry,
  FiboAnalysisError,
} from "@/lib/services/fibo-image-analyzer";

export interface ImageAnalysisResult {
  analysis: ImageStyleMoodAnalysis;
}

/**
 * Analyzes an image using Bria FIBO model
 * This is the core logic that can be called directly from server-side code
 *
 * @param imageUrl - Full URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis
 * @throws Error if analysis fails
 */
export async function analyzeImageCore(
  imageUrl: string,
): Promise<ImageAnalysisResult> {
  if (!imageUrl || !imageUrl.trim()) {
    throw new Error("Image URL is required");
  }

  try {
    // Analyze image with FIBO (includes automatic retry)
    const fiboResult = await analyzeFiboImageWithRetry({
      imageUrl,
      seed: FIBO_ANALYSIS.DEFAULT_SEED,
      timeout: FIBO_ANALYSIS.DEFAULT_TIMEOUT,
    });

    // Transform FIBO output to our schema
    const analysis = adaptFiboToAnalysis(fiboResult);

    return {
      analysis,
    };
  } catch (error) {
    if (error instanceof FiboAnalysisError) {
      throw new Error(`Image analysis failed: ${error.message}`);
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Unknown error during image analysis",
    );
  }
}
