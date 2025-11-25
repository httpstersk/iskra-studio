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
 * Streams image-to-image generation progress events.
 *
 * @remarks
 * Uses the Flux image-to-image streaming endpoint to surface intermediate
 * events and a final completion payload.
 */
export const generateImageStream = publicProcedure
  .input(
    z.object({
      imageUrl: z.string().url(),
      prompt: z.string(),
      seed: z.number().optional(),
      lastEventId: z.string().optional(),
    }),
  )
  .subscription(async function* ({ input, signal, ctx }) {
    try {
      const falClient = await getFalClient(ctx);

      // Create a unique ID for this generation
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Start streaming from fal.ai
      const stream = await falClient.stream("fal-ai/flux/dev/image-to-image", {
        input: {
          image_url: input.imageUrl,
          prompt: input.prompt,
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
          seed: input.seed,
        },
      });

      let eventIndex = 0;

      // Stream events as they come
      for await (const event of stream) {
        if (signal?.aborted) {
          break;
        }

        const eventId = `${generationId}_${eventIndex++}`;

        yield tracked(eventId, {
          type: "progress",
          data: event,
        });
      }

      // Get the final result
      const result = await stream.done();

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
        seed: resultData.seed ?? Math.random(),
      });
    } catch (error) {
      yield tracked(`error_${Date.now()}`, {
        type: "error",
        error: extractFalErrorMessage(error, "Failed to generate image"),
      });
    }
  });
