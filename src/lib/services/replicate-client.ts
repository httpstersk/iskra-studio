/**
 * Replicate API Client
 *
 * Client for Replicate's Nano Banana Pro model API.
 * Handles authentication, request/response types, and polling for async operations.
 * Uses errors-as-values pattern with @safe-std/error
 *
 * @see https://replicate.com/google/nano-banana-pro/api
 */

import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";
import { logger } from "@/lib/logger";

const log = logger.generation;

/**
 * Base URL for Replicate API
 */
const REPLICATE_API_BASE_URL = "https://api.replicate.com/v1";

/**
 * Nano Banana Pro model version
 */
const NANO_BANANA_PRO_VERSION =
  "dd58413c945870f8e6dc8204654079c60d577e76dc46a920c24dbe6a84a4cd9d";

/**
 * Polling configuration for async requests
 */
const POLLING_CONFIG = {
  /** Initial delay before first poll in milliseconds */
  INITIAL_DELAY_MS: 1000,
  /** Interval between subsequent polls in milliseconds */
  INTERVAL_MS: 1000,
  /** Maximum number of polling attempts */
  MAX_ATTEMPTS: 300,
} as const;

/**
 * Replicate prediction status
 */
type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

/**
 * Replicate prediction response
 */
interface ReplicatePrediction {
  id: string;
  status: PredictionStatus;
  urls: {
    get: string;
    cancel: string;
  };
  output?: string | string[] | null;
  error?: string | null;
}

/**
 * Nano Banana Pro input parameters
 */
export interface NanoBananaProInput {
  /** Text prompt for generation */
  prompt: string;
  /** Reference image URLs (up to 14) */
  image_input?: string[];
  /** Resolution: "1K", "2K", or "4K" */
  resolution?: "1K" | "2K" | "4K";
  /** Aspect ratio */
  aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  /** Output format */
  output_format?: "jpg" | "png";
  /** Safety filter level */
  safety_filter_level?:
    | "block_low_and_above"
    | "block_medium_and_above"
    | "block_only_high";
}

/**
 * Nano Banana Pro output
 */
export interface NanoBananaProOutput {
  /** Generated image URL */
  url: string;
  /** Original Replicate URL for storage */
  replicateUrl: string;
}

/**
 * Retrieves and validates Replicate API token from environment
 *
 * @returns Replicate API token or error
 */
function getReplicateApiToken(): string | Error {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token || !token.trim()) {
    return new Error(
      "REPLICATE_API_TOKEN environment variable is not configured. Get your API key from https://replicate.com/account/api-tokens",
    );
  }

  return token;
}

/**
 * Creates a Replicate prediction
 *
 * @param input - Input parameters for Nano Banana Pro
 * @returns Prediction response or error
 */
async function createPrediction(
  input: NanoBananaProInput,
): Promise<ReplicatePrediction | Error> {
  const token = getReplicateApiToken();
  if (token instanceof Error) {
    return token;
  }

  const result = await tryPromise(
    fetch(`${REPLICATE_API_BASE_URL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: NANO_BANANA_PRO_VERSION,
        input,
      }),
    }),
  );

  if (isErr(result)) {
    log.error("Failed to create Replicate prediction", getErrorMessage(result));
    return new Error(`Failed to create prediction: ${getErrorMessage(result)}`);
  }

  if (!result.ok) {
    const errorText = await result.text();
    log.error("Replicate API error", {
      status: result.status,
      error: errorText,
    });
    return new Error(`Replicate API error (${result.status}): ${errorText}`);
  }

  const data = await tryPromise(result.json());
  if (isErr(data)) {
    return new Error(
      `Failed to parse prediction response: ${getErrorMessage(data)}`,
    );
  }

  return data as ReplicatePrediction;
}

/**
 * Gets a prediction by ID
 *
 * @param predictionId - Prediction ID
 * @returns Prediction response or error
 */
async function getPrediction(
  predictionId: string,
): Promise<ReplicatePrediction | Error> {
  const token = getReplicateApiToken();
  if (token instanceof Error) {
    return token;
  }

  const result = await tryPromise(
    fetch(`${REPLICATE_API_BASE_URL}/predictions/${predictionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );

  if (isErr(result)) {
    log.error("Failed to get Replicate prediction", getErrorMessage(result));
    return new Error(`Failed to get prediction: ${getErrorMessage(result)}`);
  }

  if (!result.ok) {
    const errorText = await result.text();
    log.error("Replicate API error", {
      status: result.status,
      error: errorText,
    });
    return new Error(`Replicate API error (${result.status}): ${errorText}`);
  }

  const data = await tryPromise(result.json());
  if (isErr(data)) {
    return new Error(
      `Failed to parse prediction response: ${getErrorMessage(data)}`,
    );
  }

  return data as ReplicatePrediction;
}

/**
 * Polls a prediction until completion
 *
 * @param predictionId - Prediction ID
 * @returns Final prediction response or error
 */
async function pollPrediction(
  predictionId: string,
): Promise<ReplicatePrediction | Error> {
  // Initial delay
  await new Promise((resolve) =>
    setTimeout(resolve, POLLING_CONFIG.INITIAL_DELAY_MS),
  );

  for (let attempt = 0; attempt < POLLING_CONFIG.MAX_ATTEMPTS; attempt++) {
    const prediction = await getPrediction(predictionId);

    if (prediction instanceof Error) {
      return prediction;
    }

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      const errorMsg = prediction.error || `Prediction ${prediction.status}`;
      return new Error(errorMsg);
    }

    // Wait before next poll
    await new Promise((resolve) =>
      setTimeout(resolve, POLLING_CONFIG.INTERVAL_MS),
    );
  }

  return new Error(
    `Prediction timed out after ${POLLING_CONFIG.MAX_ATTEMPTS} attempts`,
  );
}

/**
 * Generates an image using Nano Banana Pro
 *
 * @param input - Input parameters
 * @returns Generated image URL or error
 */
export async function generateImageWithNanoBananaPro(
  input: NanoBananaProInput,
): Promise<NanoBananaProOutput | Error> {
  log.info("Starting Nano Banana Pro generation", {
    prompt: input.prompt.substring(0, 100),
    resolution: input.resolution || "2K",
  });

  // Create prediction
  const prediction = await createPrediction(input);
  if (prediction instanceof Error) {
    return prediction;
  }

  log.info("Replicate prediction created", { id: prediction.id });

  // Poll until completion
  const finalPrediction = await pollPrediction(prediction.id);
  if (finalPrediction instanceof Error) {
    return finalPrediction;
  }

  // Extract output URL
  // Replicate can return output as either a string or an array of strings
  if (!finalPrediction.output) {
    return new Error("No output generated");
  }

  const imageUrl =
    typeof finalPrediction.output === "string"
      ? finalPrediction.output
      : finalPrediction.output[0];

  if (!imageUrl || typeof imageUrl !== "string") {
    return new Error("Invalid output URL");
  }

  log.info("Nano Banana Pro generation complete", {
    id: finalPrediction.id,
    url: imageUrl,
  });

  return {
    url: imageUrl,
    replicateUrl: imageUrl,
  };
}
