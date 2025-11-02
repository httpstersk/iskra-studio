/**
 * Bria FIBO Image Analysis Service
 *
 * Integrates with fal.ai's FIBO model for structured image analysis.
 * FIBO provides native JSON output without complex prompting.
 *
 * API: https://fal.ai/models/bria/fibo/generate/structured_prompt/api
 */

import { createFalClient } from "@fal-ai/client";
import type { FiboStructuredPrompt } from "@/lib/adapters/fibo-to-analysis-adapter";

/**
 * FIBO API Response Structure
 */
interface FiboApiResponse {
  structured_prompt: FiboStructuredPrompt;
}

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
 * Validates and returns FAL_KEY environment variable
 */
function getFalKey(): string {
  const falKey = process.env.FAL_KEY;
  if (!falKey || !falKey.trim()) {
    throw new FiboAnalysisError(
      "FAL_KEY environment variable is not configured. Get your API key from https://fal.ai/dashboard/keys"
    );
  }
  return falKey;
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
 *   seed: 666
 * });
 * ```
 */
export async function analyzeFiboImage(
  options: FiboAnalysisOptions
): Promise<FiboStructuredPrompt> {
  const { imageUrl, seed = 666, timeout = 30000 } = options;

  // Get and validate FAL_KEY
  const falKey = getFalKey();

  // Validate image URL
  if (!imageUrl || !imageUrl.trim()) {
    throw new FiboAnalysisError("Image URL is required");
  }

  try {
    // Create FAL client with credentials
    const falClient = createFalClient({
      credentials: () => falKey,
    });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Call FIBO API via fal.ai client
      const result = (await falClient.subscribe(
        "bria/fibo/generate/structured_prompt",
        {
          input: {
            image_url: imageUrl,
            seed,
          },
          logs: true,
        }
      )) as { data: FiboApiResponse };

      clearTimeout(timeoutId);

      // Validate response - check different possible response structures
      if (!result) {
        throw new FiboAnalysisError(
          "FIBO API returned null/undefined response"
        );
      }

      // Try different response structures
      let structuredPrompt: FiboStructuredPrompt | undefined;

      // Pattern 1: result.data.structured_prompt
      if (result.data?.structured_prompt) {
        structuredPrompt = result.data.structured_prompt;
      }
      // Pattern 2: result.structured_prompt (direct in result)
      else if ((result as any).structured_prompt) {
        structuredPrompt = (result as any).structured_prompt;
      }
      // Pattern 3: result.data is the structured_prompt
      else if (result.data && typeof result.data === "object") {
        // Check if result.data has the expected fields
        if ("short_description" in result.data || "objects" in result.data) {
          structuredPrompt = result.data as any;
        }
      }

      if (!structuredPrompt) {
        throw new FiboAnalysisError(
          "FIBO API returned invalid response: missing structured_prompt. Response keys: " +
            JSON.stringify(Object.keys(result.data || result))
        );
      }

      return structuredPrompt;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw new FiboAnalysisError(
        `FIBO analysis timed out after ${timeout}ms`,
        error
      );
    }

    // Handle fal.ai client errors with detailed info
    if (error && typeof error === "object") {
      if ("status" in error) {
        const statusCode = (error as { status: number }).status;
        const message =
          (error as { message?: string }).message || "Unknown error";
        const body = (error as { body?: unknown }).body;

        throw new FiboAnalysisError(
          `FIBO API error (${statusCode}): ${message}`,
          error,
          statusCode
        );
      }

      // Handle error objects with message
      if ("message" in error) {
        const message = (error as { message: string }).message;
        throw new FiboAnalysisError(`FIBO API error: ${message}`, error);
      }
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
