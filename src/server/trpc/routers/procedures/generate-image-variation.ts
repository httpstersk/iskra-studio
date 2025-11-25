import {
  getImageModelEndpoint,
  IMAGE_MODELS,
  resolveImageSize,
} from "@/lib/image-models";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../init";

/**
 * Minimal Request shape used by rate limiting and client resolution.
 *
 * @remarks
 * We intentionally avoid coupling to a specific runtime (Node, Edge) by only
 * depending on the headers map and an IP string if present.
 */
interface RequestLike {
  headers?: Headers | Record<string, string | string[] | undefined>;
  ip?: string;
}

/**
 * A single generated image record returned by FAL image endpoints.
 *
 * @property url - Public URL for the generated image asset
 * @property width - Image width in pixels (if provided by the endpoint)
 * @property height - Image height in pixels (if provided by the endpoint)
 */
interface FalImage {
  url?: string;
  width?: number;
  height?: number;
}

/**
 * Common payload shape for FAL image endpoints (text-to-image, edit).
 *
 * @property images - Array of generated image items
 * @property seed - Seed used for generation, when provided
 * @property url - Optional direct URL when the endpoint returns a single asset
 * @property duration - Optional duration for endpoints that can produce video-like assets
 */
interface FalImageResult {
  images?: FalImage[];
  seed?: number;
  url?: string;
  duration?: number;
}

/**
 * Converts a multi-line prompt string into a single line by collapsing all
 * whitespace runs (including newlines and tabs) into single spaces.
 */
const RE_WHITESPACE = /\s+/g;
const SINGLE_SPACE = " ";

function toSingleLinePrompt(input: string): string {
  return input.replace(RE_WHITESPACE, SINGLE_SPACE).trim();
}

/**
 * Safely extracts the typed payload from a FAL response.
 *
 * Many fal.ai endpoints return either the payload directly or under a `data`
 * key. This helper narrows an unknown response into the requested shape.
 *
 * @typeParam T - Expected payload shape for the endpoint
 * @param input - Unknown response value returned by the FAL client
 * @returns The extracted payload cast to T when possible; otherwise undefined
 */
function extractResultData<T extends object>(input: unknown): T | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const record = input as Record<string, unknown>;
  const data = record["data"];

  if (typeof data === "object" && data !== null) {
    return data as T;
  }

  return input as T;
}

/**
 * Extracts detailed error message from Fal.ai errors.
 *
 * Fal.ai errors may contain additional detail in `error.body.detail` or
 * `error.detail` properties that provide more context about validation or
 * content moderation failures.
 *
 * @param error - The caught error (any type)
 * @param fallbackMessage - Default message if no detail is available
 * @returns Extracted error message with detail when available
 */
function extractFalErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  let errorMessage = error.message;
  const errorObj = error as Error & {
    body?: { detail?: unknown };
    detail?: unknown;
  };

  if (errorObj.body?.detail) {
    errorMessage =
      typeof errorObj.body.detail === "string"
        ? errorObj.body.detail
        : JSON.stringify(errorObj.body.detail);
  } else if (errorObj.detail) {
    errorMessage =
      typeof errorObj.detail === "string"
        ? errorObj.detail
        : JSON.stringify(errorObj.detail);
  }

  return errorMessage;
}

/**
 * Resolves an authenticated FAL client instance with rate limiting applied.
 *
 * @param ctx - tRPC context containing request and optional userId from Clerk
 * @param isVideo - Whether the request should use video rate limits
 * @returns A FAL client configured for the current request
 * @throws Error when the active rate limit bucket is exhausted
 */
async function getFalClient(
  ctx: { req?: RequestLike; userId?: string },
  isVideo: boolean = false,
) {
  const { resolveFalClient, standardRateLimiter, videoRateLimiter } =
    await import("@/lib/fal/utils");

  const headersSource =
    ctx.req?.headers instanceof Headers ? ctx.req.headers : ctx.req?.headers;

  const resolved = await resolveFalClient({
    limiter: isVideo ? videoRateLimiter : standardRateLimiter,
    headers: headersSource,
    bucketId: isVideo ? "video" : undefined,
    fallbackIp: typeof ctx.req?.ip === "string" ? ctx.req.ip : undefined,
    userId: ctx.userId,
    limitType: isVideo ? "video" : "standard",
  });

  if (resolved.limited) {
    const errorMessage = isVideo
      ? `Video generation rate limit exceeded: 1 video per ${resolved.period}.`
      : `Rate limit exceeded per ${resolved.period}.`;
    throw new Error(errorMessage);
  }

  return resolved.client;
}

/**
 * Generates image variations using Seedream v4 Edit or Nano Banana Edit.
 *
 * @remarks
 * Non-streaming: subscribes until completion and emits a single completion
 * event with the resulting image. Supports preset sizes or explicit width
 * and height. Model can be switched between "seedream" and "nano-banana".
 */
export const generateImageVariation = publicProcedure
  .input(
    z.object({
      imageUrls: z.array(z.string().url()),
      prompt: z.string(),
      model: z
        .enum([IMAGE_MODELS.SEEDREAM, IMAGE_MODELS.NANO_BANANA])
        .default(IMAGE_MODELS.SEEDREAM),
      provider: z.enum(["fal", "replicate"]).optional().default("fal"),
      imageSize: z
        .union([
          z.enum([
            "landscape_16_9",
            "portrait_16_9",
            "landscape_4_3",
            "portrait_4_3",
            "square",
          ]),
          z.object({
            width: z.number(),
            height: z.number(),
          }),
        ])
        .optional(),
      seed: z.number().optional(),
      lastEventId: z.string().optional(),
    }),
  )
  .subscription(async function* ({ input, signal, ctx }) {
    try {
      // Create a unique ID for this generation
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Resolve imageSize to a concrete {width, height} object
      const resolvedImageSize = resolveImageSize(input.imageSize);
      // Normalize prompt to a single line for cleaner provider input
      const compactPrompt = toSingleLinePrompt(input.prompt);

      // Route to appropriate provider
      if (input.provider === "replicate") {
        // Use Replicate Nano Banana Pro
        const { generateImageWithNanoBananaPro } = await import(
          "@/lib/services/replicate-client"
        );

        const nanoBananaAspectRatio =
          resolvedImageSize.height > resolvedImageSize.width ? "9:16" : "16:9";

        const result = await generateImageWithNanoBananaPro({
          prompt: compactPrompt,
          image_input: input.imageUrls,
          aspect_ratio: nanoBananaAspectRatio,
          resolution: "1K",
          output_format: "png",
        });

        if (result instanceof Error) {
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: result.message,
          });
          return;
        }

        if (signal?.aborted) {
          return;
        }

        // Send the final image with replicateUrl
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          imageUrl: result.url,
          replicateUrl: result.replicateUrl,
          provider: "replicate" as const,
        });
      } else {
        // Use Fal.ai (existing logic)
        const falClient = await getFalClient(ctx);

        // Get the endpoint based on the selected model
        const endpoint = getImageModelEndpoint(input.model);

        // Build input based on model - Nano Banana and Seedream have different schemas
        // Nano Banana uses aspect_ratio instead of image_size
        const nanoBananaAspectRatio =
          resolvedImageSize.height > resolvedImageSize.width ? "9:16" : "16:9";

        const falInput =
          input.model === IMAGE_MODELS.NANO_BANANA
            ? {
                // Nano Banana Edit API schema
                image_urls: input.imageUrls,
                prompt: compactPrompt,
                aspect_ratio: nanoBananaAspectRatio,
                num_images: 1,
                output_format: "png" as const,
                resolution: "1K", // 1K, 2K, 4K
              }
            : {
                // Seedream Edit API schema
                enable_safety_checker: false,
                image_size: resolvedImageSize,
                image_urls: input.imageUrls,
                num_images: 1,
                prompt: compactPrompt,
                ...(input.seed !== undefined ? { seed: input.seed } : {}),
              };

        // Subscribe to the model endpoint and wait for completion
        const result = await falClient.subscribe(endpoint, {
          input: falInput,
          pollInterval: 500, // Reduced from 1000ms for 2x faster completion detection
          logs: true,
        });

        if (signal?.aborted) {
          return;
        }

        // Handle different possible response structures
        const resultData = extractResultData<FalImageResult>(result) ?? {
          images: [],
        };
        const images = resultData.images ?? [];

        if (!images?.[0]?.url) {
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No image generated",
          });
          return;
        }

        // Send the final image
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          imageUrl: images[0].url,
          provider: "fal" as const,
          seed: resultData.seed ?? Math.random(),
        });
      }
    } catch (error) {
      yield tracked(`error_${Date.now()}`, {
        type: "error",
        error: extractFalErrorMessage(
          error,
          "Failed to generate image variation",
        ),
      });
    }
  });
