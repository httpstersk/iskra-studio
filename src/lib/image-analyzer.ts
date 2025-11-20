/**
 * Shared Image Analysis Logic
 * Can be called directly from server-side code without HTTP requests
 * Uses errors-as-values pattern with @safe-std/error
 *
 * Now powered by Bria FIBO model for faster, more accurate image analysis
 */

import { FIBO_ANALYSIS, getFiboSeed } from "@/constants/fibo";
import { adaptFiboToAnalysis } from "@/lib/adapters/fibo-to-analysis-adapter";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import {
  analyzeFiboImageWithRetry,
  FiboAnalysisError,
} from "@/lib/services/fibo-image-analyzer";
import {
  FiboAnalysisErr,
  ValidationErr,
  isErr,
  isFiboAnalysisErr,
  isValidationErr,
  err,
} from "@/lib/errors/safe-errors";

export interface ImageAnalysisResult {
  analysis: ImageStyleMoodAnalysis;
}

/**
 * Analyzes an image using Bria FIBO model
 * This is the core logic that can be called directly from server-side code
 * Returns errors as values instead of throwing
 *
 * @param imageUrl - Full URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis or error
 */
export async function analyzeImageCore(
  imageUrl: string
): Promise<ImageAnalysisResult | FiboAnalysisErr | ValidationErr> {
  if (!imageUrl || !imageUrl.trim()) {
    return new ValidationErr({
      message: "Image URL is required",
      field: "imageUrl",
    });
  }

  // Analyze image with FIBO (includes automatic retry)
  const fiboResult = await analyzeFiboImageWithRetry({
    imageUrl,
    seed: getFiboSeed(),
    timeout: FIBO_ANALYSIS.REQUEST_TIMEOUT,
  });

  if (isErr(fiboResult)) {
    // Pass through validation errors
    if (isValidationErr(fiboResult)) {
      return fiboResult;
    }

    // Wrap other errors in FiboAnalysisErr
    if (isFiboAnalysisErr(fiboResult)) {
      return new FiboAnalysisErr({
        message: `Image analysis failed: ${fiboResult.payload.message}`,
        cause: fiboResult,
      });
    }

    // Handle unexpected error types
    return new FiboAnalysisErr({
      message: "Unknown error during image analysis",
      cause: fiboResult,
    });
  }

  // Transform FIBO output to our schema
  const analysis = adaptFiboToAnalysis(fiboResult);

  return {
    analysis,
  };
}
