/**
 * Bria FIBO Image Analysis Service
 *
 * Integrates with Bria's official FIBO platform API for structured image analysis.
 * FIBO provides native JSON output without complex prompting.
 *
 * @see https://docs.bria.ai/image-generation/v2-endpoints/structured-prompt-generate
 */

import { FIBO_ANALYSIS, getFiboSeed } from "@/constants/fibo";
import type { FiboStructuredPrompt } from "@/lib/adapters/fibo-to-analysis-adapter";
import {
  BriaApiError,
  generateStructuredPrompt,
} from "@/lib/services/bria-client";

/**
 * Configuration for FIBO analysis
 */
export interface FiboAnalysisOptions {
  /** Image URL to analyze (must be publicly accessible or base64 data URI) */
  imageUrl: string;
  /** Optional random seed for reproducibility */
  seed?: number;
  /** Request timeout in seconds */
  timeout?: number;
}

/**
 * Error thrown when FIBO analysis fails
 */
export class FiboAnalysisError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "FiboAnalysisError";
  }
}

/**
 * Analyzes an image using Bria FIBO model
 *
 * @param options - Analysis configuration
 * @returns Promise resolving to FIBO's structured prompt output
 * @throws FiboAnalysisError if analysis fails
 *
 * @example
 * ```typescript
 * const result = await analyzeFiboImage({
 *   imageUrl: "https://example.com/image.jpg",
 *   seed: getFiboSeed()
 * });
 * ```
 */
export async function analyzeFiboImage(
  options: FiboAnalysisOptions
): Promise<FiboStructuredPrompt> {
  const {
    imageUrl,
    seed = getFiboSeed(),
    timeout = FIBO_ANALYSIS.REQUEST_TIMEOUT,
  } = options;

  // Validate image URL
  if (!imageUrl || !imageUrl.trim()) {
    throw new FiboAnalysisError("Image URL is required");
  }

  try {
    // Call Bria API to generate structured prompt from image
    // Note: Bria API expects images as an array even for single image
    const result = await generateStructuredPrompt(
      {
        images: [imageUrl],
        seed,
        sync: false,
      },
      timeout
    );

    // Parse the structured prompt JSON string
    const structuredPrompt: FiboStructuredPrompt = JSON.parse(
      result.structured_prompt
    );

    return structuredPrompt;
  } catch (error) {
    // Handle Bria API errors
    if (error instanceof BriaApiError) {
      let errorMessage = `${error.message} (Request ID: ${error.requestId || "N/A"})`;

      // Add helpful context for common error codes
      if (error.statusCode === 422) {
        errorMessage +=
          " - This may indicate content moderation failure or invalid input parameters. Check that the image URL is publicly accessible and the content is appropriate.";
      }

      throw new FiboAnalysisError(errorMessage, error.cause, error.statusCode);
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new FiboAnalysisError(
        "Failed to parse FIBO structured prompt: invalid JSON",
        error
      );
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during FIBO analysis";
    throw new FiboAnalysisError(errorMessage, error);
  }
}

/**
 * Analyzes an image with automatic retry on transient failures
 *
 * @param options - Analysis configuration
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Promise resolving to FIBO's structured prompt output
 */
export async function analyzeFiboImageWithRetry(
  options: FiboAnalysisOptions,
  maxRetries = 2
): Promise<FiboStructuredPrompt> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeFiboImage(options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation errors or authentication errors
      if (error instanceof FiboAnalysisError) {
        if (
          error.statusCode === 400 || // Bad request
          error.statusCode === 401 || // Unauthorized
          error.statusCode === 403 // Forbidden
        ) {
          throw error;
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const errorDetails = lastError?.message || "Unknown error";

  throw new FiboAnalysisError(
    `FIBO analysis failed after ${maxRetries + 1} attempts. Last error: ${errorDetails}`,
    lastError
  );
}
