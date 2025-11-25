import {
  DEFAULT_IMAGE_SIZE_2K_LANDSCAPE,
  resolveImageSize,
  TEXT_TO_IMAGE_ENDPOINT,
} from "@/lib/image-models";
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
 * Generates an image from text using Seedream v4.
 *
 * @remarks
 * This mutation is non-streaming and returns the first generated image with
 * dimensions when available. The endpoint is centralized via
 * `TEXT_TO_IMAGE_ENDPOINT`.
 */
export const generateTextToImage = publicProcedure
  .input(
    z.object({
      prompt: z.string(),
      seed: z.number().optional(),
      imageSize: z
        .union([
          z.enum([
            "landscape_16_9",
            "portrait_16_9",
            "landscape_4_3",
            "portrait_4_3",
            "square",
          ]),
          z.object({ width: z.number(), height: z.number() }),
        ])
        .optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const falClient = await getFalClient(ctx);

      const resolvedImageSize = resolveImageSize(
        input.imageSize ?? DEFAULT_IMAGE_SIZE_2K_LANDSCAPE,
      );

      const result = await falClient.subscribe(TEXT_TO_IMAGE_ENDPOINT, {
        input: {
          image_size: resolvedImageSize,
          num_images: 1,
          prompt: input.prompt,
          ...(input.seed !== undefined ? { seed: input.seed } : {}),
        },
      });

      // Handle different possible response structures
      const resultData = extractResultData<FalImageResult>(result) ?? {
        images: [],
      };
      const images = resultData.images ?? [];
      if (!images[0]?.url) {
        throw new Error("No image generated");
      }

      const outWidth = images[0].width ?? resolvedImageSize.width;
      const outHeight = images[0].height ?? resolvedImageSize.height;

      return {
        url: images[0].url ?? "",
        width: outWidth,
        height: outHeight,
        seed: resultData.seed ?? Math.random(),
      };
    } catch (error) {
      throw new Error(
        extractFalErrorMessage(error, "Failed to generate image"),
      );
    }
  });
