/**
 * Bria API Client
 *
 * Official client for Bria's FIBO platform API.
 * Handles authentication, request/response types, and polling for async operations.
 *
 * @see https://docs.bria.ai/image-generation/v2-endpoints
 */

/**
 * Base URL for Bria API
 */
const BRIA_API_BASE_URL = "https://engine.prod.bria-api.com/v2";

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
 * Bria API endpoints
 */
export const BRIA_ENDPOINTS = {
  /** Generate structured prompt from image or text */
  STRUCTURED_PROMPT_GENERATE: `${BRIA_API_BASE_URL}/structured_prompt/generate`,
  /** Generate image from structured prompt or text */
  IMAGE_GENERATE: `${BRIA_API_BASE_URL}/image/generate`,
} as const;

/**
 * Error thrown when Bria API token is not configured
 */
export class BriaTokenError extends Error {
  constructor(
    message = "BRIA_API_TOKEN environment variable is not configured"
  ) {
    super(message);
    this.name = "BriaTokenError";
  }
}

/**
 * Error thrown when Bria API request fails
 */
export class BriaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly requestId?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "BriaApiError";
  }
}

/**
 * Base response from Bria API
 */
interface BriaBaseResponse<T> {
  request_id: string;
  result?: T;
  warning?: string;
}

/**
 * Async response with status URL for polling
 */
interface BriaAsyncResponse {
  request_id: string;
  status_url: string;
}

/**
 * Status response when polling
 * Note: Bria API returns uppercase status values
 */
interface BriaStatusResponse<T> {
  error?: string;
  request_id: string;
  result?: T;
  status:
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "FAILED"
    | "pending"
    | "processing"
    | "completed"
    | "failed";
  warning?: string;
}

/**
 * Structured prompt result
 */
export interface BriaStructuredPromptResult {
  seed: number;
  structured_prompt: string;
}

/**
 * Image generation result
 */
export interface BriaImageGenerationResult {
  image_url: string;
  seed: number;
  structured_prompt: string;
}

/**
 * Request options for structured prompt generation
 */
export interface BriaStructuredPromptRequest {
  /** Image URLs to analyze (optional, array of URLs even for single image) */
  images?: string[];
  /** Text prompt (optional) */
  prompt?: string;
  /** Existing structured prompt to refine (optional) */
  structured_prompt?: string;
  /** Random seed for deterministic generation (optional) */
  seed?: number;
  /** If true, uses synchronous mode (optional, default: false) */
  sync?: boolean;
}

/**
 * Request options for image generation
 */
export interface BriaImageGenerationRequest {
  /** Image URLs reference (optional, array of URLs even for single image) */
  images?: string[];
  /** Text prompt (optional) */
  prompt?: string;
  /** Structured prompt (optional) */
  structured_prompt?: string;
  /** Aspect ratio (optional) */
  aspect_ratio?: string;
  /** Guidance scale (optional) */
  guidance_scale?: number;
  /** Number of diffusion steps (optional) */
  steps_num?: number;
  /** Random seed (optional) */
  seed?: number;
  /** If true, uses synchronous mode (optional, default: false) */
  sync?: boolean;
}

/**
 * Retrieves and validates Bria API token from environment
 *
 * @returns Bria API token
 * @throws BriaTokenError if token is not configured
 */
export function getBriaApiToken(): string {
  const token = process.env.BRIA_API_TOKEN;

  if (!token || !token.trim()) {
    throw new BriaTokenError(
      "BRIA_API_TOKEN environment variable is not configured. Get your API token from https://platform.bria.ai/console/account/api-keys"
    );
  }

  return token;
}

/**
 * Makes an authenticated request to Bria API
 *
 * @param endpoint - API endpoint URL
 * @param body - Request body
 * @param timeout - Request timeout in milliseconds (optional)
 * @returns API response
 * @throws BriaApiError if request fails
 */
async function briaRequest<T>(
  endpoint: string,
  body: Record<string, any>,
  timeout = 30000
): Promise<T> {
  const token = getBriaApiToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        api_token: token,
      },
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      // Try to extract detailed error message
      if (data.error) {
        errorMessage =
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error);
      } else if (data.message) {
        errorMessage =
          typeof data.message === "string"
            ? data.message
            : JSON.stringify(data.message);
      } else if (data.detail) {
        // Bria API may use 'detail' for validation errors
        errorMessage =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);
      }

      throw new BriaApiError(
        `Bria API error: ${errorMessage}`,
        response.status,
        data.request_id
      );
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout
    if (error instanceof Error && error.name === "AbortError") {
      throw new BriaApiError(
        `Bria API request timed out after ${timeout}ms`,
        undefined,
        undefined,
        error
      );
    }

    // Re-throw BriaApiError
    if (error instanceof BriaApiError) {
      throw error;
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new BriaApiError(
      `Bria API request failed: ${errorMessage}`,
      undefined,
      undefined,
      error
    );
  }
}

/**
 * Polls status URL until completion or timeout
 *
 * @param statusUrl - Status URL to poll
 * @returns Final result
 * @throws BriaApiError if polling fails or times out
 */
async function pollStatus<T>(statusUrl: string): Promise<BriaBaseResponse<T>> {
  const token = getBriaApiToken();
  let attempts = 0;

  // Initial delay before first poll
  await new Promise((resolve) =>
    setTimeout(resolve, POLLING_CONFIG.INITIAL_DELAY_MS)
  );

  while (attempts < POLLING_CONFIG.MAX_ATTEMPTS) {
    attempts++;

    try {
      const response = await fetch(statusUrl, {
        headers: {
          api_token: token,
        },
        method: "GET",
      });

      const data = (await response.json()) as BriaStatusResponse<T>;

      // Check status (case-insensitive)
      const status = data.status?.toLowerCase();

      if (status === "completed") {
        if (!data.result) {
          throw new BriaApiError(
            "Bria API completed but returned no result",
            response.status,
            data.request_id
          );
        }

        return {
          request_id: data.request_id,
          result: data.result,
          warning: data.warning,
        };
      }

      if (status === "failed") {
        const errorDetail = data.error
          ? typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error)
          : "Unknown error";
        throw new BriaApiError(
          `Bria API request failed: ${errorDetail}`,
          response.status,
          data.request_id
        );
      }

      // Still pending/processing, wait before next poll
      await new Promise((resolve) =>
        setTimeout(resolve, POLLING_CONFIG.INTERVAL_MS)
      );
    } catch (error) {
      if (error instanceof BriaApiError) {
        throw error;
      }

      console.warn(`[Bria] Network error on attempt ${attempts}:`, error);

      // Handle network errors - retry
      if (attempts >= POLLING_CONFIG.MAX_ATTEMPTS) {
        throw new BriaApiError(
          "Bria API polling max attempts reached",
          undefined,
          undefined,
          error
        );
      }

      // Wait before retry
      await new Promise((resolve) =>
        setTimeout(resolve, POLLING_CONFIG.INTERVAL_MS)
      );
    }
  }

  throw new BriaApiError(
    `Bria API polling timed out after ${POLLING_CONFIG.MAX_ATTEMPTS} attempts (${(POLLING_CONFIG.MAX_ATTEMPTS * POLLING_CONFIG.INTERVAL_MS) / 1000}s)`
  );
}

/**
 * Generates a structured prompt from image or text input
 *
 * @param request - Request options
 * @param timeout - Request timeout in milliseconds (optional)
 * @returns Structured prompt result
 * @throws BriaApiError if generation fails
 *
 * @example
 * ```typescript
 * // From image
 * const result = await generateStructuredPrompt({
 *   images: ["https://example.com/image.jpg"],
 *   seed: 42
 * });
 *
 * // From text
 * const result = await generateStructuredPrompt({
 *   prompt: "A red balloon",
 *   seed: 42
 * });
 *
 * // Refine existing structured prompt
 * const result = await generateStructuredPrompt({
 *   structured_prompt: previousResult.structured_prompt,
 *   prompt: "Add sunlight",
 *   seed: 42
 * });
 * ```
 */
export async function generateStructuredPrompt(
  request: BriaStructuredPromptRequest,
  timeout = 30000
): Promise<BriaStructuredPromptResult> {
  const { sync = false, ...body } = request;

  // If sync mode, make synchronous request
  if (sync) {
    const response = await briaRequest<
      BriaBaseResponse<BriaStructuredPromptResult>
    >(
      BRIA_ENDPOINTS.STRUCTURED_PROMPT_GENERATE,
      { ...body, sync: true },
      timeout
    );

    if (!response.result) {
      throw new BriaApiError(
        "Bria API returned no result",
        undefined,
        response.request_id
      );
    }

    return response.result;
  }

  // Async mode - poll for result
  const asyncResponse = await briaRequest<BriaAsyncResponse>(
    BRIA_ENDPOINTS.STRUCTURED_PROMPT_GENERATE,
    { ...body, sync: false },
    timeout
  );

  const finalResponse = await pollStatus<BriaStructuredPromptResult>(
    asyncResponse.status_url
  );

  if (!finalResponse.result) {
    throw new BriaApiError(
      "Bria API returned no result",
      undefined,
      finalResponse.request_id
    );
  }

  return finalResponse.result;
}

/**
 * Generates an image from structured prompt or text input
 *
 * @param request - Request options
 * @param timeout - Request timeout in milliseconds (optional)
 * @returns Image generation result
 * @throws BriaApiError if generation fails
 *
 * @example
 * ```typescript
 * // From structured prompt
 * const result = await generateImage({
 *   structured_prompt: structuredPrompt,
 *   aspect_ratio: "16:9",
 *   seed: 42
 * });
 *
 * // From text prompt
 * const result = await generateImage({
 *   prompt: "A red balloon",
 *   aspect_ratio: "16:9",
 *   seed: 42
 * });
 *
 * // Refine with reference image
 * const result = await generateImage({
 *   images: ["https://example.com/reference.jpg"],
 *   structured_prompt: structuredPrompt,
 *   prompt: "Inspired by this image",
 *   seed: 42
 * });
 * ```
 */
export async function generateImage(
  request: BriaImageGenerationRequest,
  timeout = 30000
): Promise<BriaImageGenerationResult> {
  const { sync = false, ...body } = request;

  // If sync mode, make synchronous request
  if (sync) {
    const response = await briaRequest<
      BriaBaseResponse<BriaImageGenerationResult>
    >(BRIA_ENDPOINTS.IMAGE_GENERATE, { ...body, sync: true }, timeout);

    if (!response.result) {
      throw new BriaApiError(
        "Bria API returned no result",
        undefined,
        response.request_id
      );
    }

    return response.result;
  }

  // Async mode - poll for result
  const asyncResponse = await briaRequest<BriaAsyncResponse>(
    BRIA_ENDPOINTS.IMAGE_GENERATE,
    { ...body, sync: false },
    timeout
  );

  const finalResponse = await pollStatus<BriaImageGenerationResult>(
    asyncResponse.status_url
  );

  if (!finalResponse.result) {
    throw new BriaApiError(
      "Bria API returned no result",
      undefined,
      finalResponse.request_id
    );
  }

  return finalResponse.result;
}
