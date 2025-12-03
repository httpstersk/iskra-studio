/**
 * Bria FIBO Image Analysis Service
 *
 * Integrates with Bria's official FIBO platform API for structured image analysis.
 * FIBO provides native JSON output without complex prompting.
 * Uses errors-as-values pattern with @safe-std/error
 *
 * @see https://docs.bria.ai/image-generation/v2-endpoints/structured-prompt-generate
 */

import { FIBO_ANALYSIS, getFiboSeed } from "@/constants/fibo";
import type { FiboStructuredPrompt } from "@/lib/adapters/fibo-to-analysis-adapter";
import {
  FiboAnalysisErr,
  isBriaApiErr,
  isErr,
  RateLimitErr,
  trySync,
  ValidationErr,
} from "@/lib/errors/safe-errors";
import { generateStructuredPrompt } from "@/lib/services/bria-client";

/** User-friendly message for rate limit errors */
const RATE_LIMIT_MESSAGE =
  "The image analysis service has reached its request limit. Please try again later or contact support to upgrade your plan.";

/**
 * Configuration for FIBO analysis
 */
export interface FiboAnalysisOptions {
  /** Image URLs to analyze (must be publicly accessible or base64 data URI) */
  imageUrls: string[];
  /** Optional random seed for reproducibility */
  seed?: number;
  /** Request timeout in seconds */
  timeout?: number;
}

/**
 * Analyzes an image using Bria FIBO model
 * Returns errors as values instead of throwing
 *
 * @param options - Analysis configuration
 * @returns Promise resolving to FIBO's structured prompt output or error
 *
 * @example
 * ```typescript
 * const result = await analyzeFiboImage({
 *   imageUrls: ["https://example.com/image.jpg"],
 *   seed: getFiboSeed()
 * });
 * if (isErr(result)) {
 *   console.error('Analysis failed:', getErrorMessage(result));
 *   return;
 * }
 * ```
 */
export async function analyzeFiboImage(
  options: FiboAnalysisOptions
): Promise<
  FiboStructuredPrompt | FiboAnalysisErr | RateLimitErr | ValidationErr
> {
  const {
    imageUrls,
    seed = getFiboSeed(),
    timeout = FIBO_ANALYSIS.REQUEST_TIMEOUT,
  } = options;

  // Validate image URLs
  if (!imageUrls || imageUrls.length === 0) {
    return new ValidationErr({
      message: "Image URLs are required",
      field: "imageUrls",
    });
  }

  // Call Bria API to generate structured prompt from image
  const result = await generateStructuredPrompt(
    {
      images: imageUrls,
      seed,
      sync: false,
    },
    timeout
  );

  if (isErr(result)) {
    // Handle Bria API errors
    if (isBriaApiErr(result)) {
      // Check for rate limit error - return user-friendly message
      if (result.payload.statusCode === 429) {
        return new RateLimitErr({
          message: RATE_LIMIT_MESSAGE,
          cause: result,
        });
      }

      let errorMessage = `${result.payload.message} (Request ID: ${result.payload.requestId || "N/A"})`;

      // Add helpful context for common error codes
      if (result.payload.statusCode === 422) {
        errorMessage +=
          " - This may indicate content moderation failure or invalid input parameters. Check that the image URL is publicly accessible and the content is appropriate.";
      }

      return new FiboAnalysisErr({
        message: errorMessage,
        cause: result,
      });
    }

    // Handle other error types
    return new FiboAnalysisErr({
      message: `FIBO analysis failed: ${result.payload}`,
      cause: result,
    });
  }

  // Parse the structured prompt JSON string
  const parseResult = trySync(JSON.parse, result.structured_prompt);

  if (isErr(parseResult)) {
    return new FiboAnalysisErr({
      message: "Failed to parse FIBO structured prompt: invalid JSON",
      cause: parseResult,
    });
  }

  return parseResult as FiboStructuredPrompt;
}

/**
 * Analyzes an image with automatic retry on transient failures
 * Returns errors as values instead of throwing
 *
 * @param options - Analysis configuration
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Promise resolving to FIBO's structured prompt output or error
 */
export async function analyzeFiboImageWithRetry(
  options: FiboAnalysisOptions,
  maxRetries = 2
): Promise<
  FiboStructuredPrompt | FiboAnalysisErr | RateLimitErr | ValidationErr
> {
  let lastError: FiboAnalysisErr | RateLimitErr | ValidationErr | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await analyzeFiboImage(options);

    if (!isErr(result)) {
      return result;
    }

    lastError = result;

    // Don't retry on validation errors or rate limit errors
    if (result instanceof ValidationErr || result instanceof RateLimitErr) {
      return result;
    }

    // Don't retry on specific error codes (authentication, bad request)
    if (result instanceof FiboAnalysisErr) {
      const cause = result.payload.cause;
      if (isBriaApiErr(cause)) {
        const statusCode = cause.payload.statusCode;
        if (
          statusCode === 400 || // Bad request
          statusCode === 401 || // Unauthorized
          statusCode === 403 // Forbidden
        ) {
          return result;
        }
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return new FiboAnalysisErr({
    message: `FIBO analysis failed after ${maxRetries + 1} attempts`,
    cause: lastError,
  });
}
