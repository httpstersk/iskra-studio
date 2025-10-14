import {
  resolveFalClient,
  standardRateLimiter,
  videoRateLimiter,
} from "@/lib/fal/utils";
import {
  DEFAULT_IMAGE_SIZE_4K_LANDSCAPE,
  TEXT_TO_IMAGE_ENDPOINT,
  resolveImageSize,
} from "@/lib/image-models";
import { getVideoModelById, SORA_2_MODEL_ID } from "@/lib/video-models";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../init";

/**
 * API response envelope from fal.ai endpoints.
 *
 * Some FAL endpoints return the payload directly, while others wrap the payload
 * under a `data` property. This type captures only the common surface area that
 * our handlers branch on (images, video url, duration, seed), without
 * over-constraining less relevant fields.
 *
 * @remarks
 * This type is intentionally permissive to tolerate minor upstream response
 * shape changes while still providing helpful property hints.
 */
type ApiResponse = {
  data?: {
    video?: { url?: string };
    url?: string;
    images?: Array<{ url?: string; width?: number; height?: number }>;
    duration?: number;
    seed?: number;
  };
  video_url?: string;
  video?: { url?: string };
  duration?: number;
  [key: string]: unknown;
} & Record<string, unknown>;

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
 * Resolves an authenticated FAL client instance with rate limiting applied.
 *
 * @param ctx - tRPC context containing a minimal Request-like object
 * @param isVideo - Whether the request should use video rate limits
 * @returns A FAL client configured for the current request
 * @throws Error when the active rate limit bucket is exhausted
 */
async function getFalClient(
  ctx: { req?: RequestLike; user?: { id: string } },
  isVideo: boolean = false
) {
  const headersSource =
    ctx.req?.headers instanceof Headers ? ctx.req.headers : ctx.req?.headers;

  const resolved = await resolveFalClient({
    limiter: isVideo ? videoRateLimiter : standardRateLimiter,
    headers: headersSource,
    bucketId: isVideo ? "video" : undefined,
    fallbackIp: typeof ctx.req?.ip === "string" ? ctx.req.ip : undefined,
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
 * Downloads a remote image as a Buffer.
 *
 * @param url - The image URL to fetch
 * @returns The downloaded file contents as a Node.js Buffer
 * @throws Error when the request fails or returns a non-2xx status
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * tRPC application router for image and video generation workflows.
 *
 * @remarks
 * This router exposes streaming subscriptions for long-running operations and
 * mutations for single-shot requests. It integrates with fal.ai through a
 * server-side client, transparently applying rate limits.
 */
export const appRouter = router({
  /**
   * Generates a video from a single input image.
   *
   * Input accepts model selection and rendering parameters and emits tracked
   * events for start, progress, completion, and error states.
   */
  generateImageToVideo: publicProcedure
    .input(
      z
        .object({
          aspectRatio: z.enum(["auto", "9:16", "16:9"]).optional(),
          duration: z.union([z.number(), z.string()]).optional(),
          imageUrl: z.string().url(),
          modelId: z.string().optional(),
          prompt: z.string().optional(),
          resolution: z.enum(["auto", "720p", "1080p"]).optional(),
        })
        .passthrough()
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(ctx, true);
        const generationId = `img2vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        yield tracked(`${generationId}_start`, {
          progress: 0,
          status: "Starting image-to-video conversion...",
          type: "progress",
        });

        const model = getVideoModelById(input.modelId || SORA_2_MODEL_ID);

        if (!model) {
          throw new Error(`Unknown model ID: ${input.modelId ?? "undefined"}`);
        }

        const parsedDuration =
          typeof input.duration === "string"
            ? Number.parseInt(input.duration, 10)
            : input.duration;

        const resolvedDuration = (() => {
          if (parsedDuration === undefined || parsedDuration === null) {
            return 4;
          }

          if (!Number.isFinite(parsedDuration) || parsedDuration % 1 !== 0) {
            throw new Error("Invalid duration value");
          }

          if (parsedDuration < 1 || parsedDuration > 60) {
            throw new Error("Duration must be between 1 and 60 seconds");
          }

          return parsedDuration;
        })();

        const soraInput: Record<string, unknown> = {
          aspect_ratio:
            (input as { aspectRatio?: string }).aspectRatio ||
            (model.defaults.aspectRatio as string) ||
            "auto",
          duration: resolvedDuration,
          image_url: input.imageUrl,
          prompt: input.prompt || "",
          resolution:
            input.resolution || (model.defaults.resolution as string) || "auto",
        };

        const result = (await falClient.subscribe(model.endpoint, {
          input: soraInput,
        })) as ApiResponse;

        yield tracked(`${generationId}_progress`, {
          progress: 100,
          status: "Video generation complete",
          type: "progress",
        });

        const videoUrl =
          result.data?.video?.url ||
          result.data?.url ||
          result.video?.url ||
          result.url;

        if (!videoUrl) {
          yield tracked(`${generationId}_error`, {
            error: "No video generated",
            type: "error",
          });
          return;
        }

        const videoDuration =
          result.data?.duration || result.duration || resolvedDuration;

        yield tracked(`${generationId}_complete`, {
          duration: videoDuration,
          type: "complete",
          videoUrl,
        });
      } catch (error) {
        yield tracked(`error_${Date.now()}`, {
          error:
            error instanceof Error
              ? error.message
              : "Failed to convert image to video",
          type: "error",
        });
      }
    }),
  /**
   * Generates an image from text using Seedream v4.
   *
   * @remarks
   * This mutation is non-streaming and returns the first generated image with
   * dimensions when available. The endpoint is centralized via
   * `TEXT_TO_IMAGE_ENDPOINT`.
   */
  generateTextToImage: publicProcedure
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const falClient = await getFalClient(ctx);

        const resolvedImageSize = resolveImageSize(
          input.imageSize ?? DEFAULT_IMAGE_SIZE_4K_LANDSCAPE
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
          error instanceof Error ? error.message : "Failed to generate image"
        );
      }
    }),

  /**
   * Streams image-to-image generation progress events.
   *
   * @remarks
   * Uses the Flux image-to-image streaming endpoint to surface intermediate
   * events and a final completion payload.
   */
  generateImageStream: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string(),
        seed: z.number().optional(),
        lastEventId: z.string().optional(),
      })
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(ctx);

        // Create a unique ID for this generation
        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Start streaming from fal.ai
        const stream = await falClient.stream(
          "fal-ai/flux/dev/image-to-image",
          {
            input: {
              image_url: input.imageUrl,
              prompt: input.prompt,
              num_inference_steps: 4,
              num_images: 1,
              enable_safety_checker: true,
              seed: input.seed,
            },
          }
        );

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
          error:
            error instanceof Error ? error.message : "Failed to generate image",
        });
      }
    }),

  /**
   * Generates image variations using Seedream v4 Edit.
   *
   * @remarks
   * Non-streaming: subscribes until completion and emits a single completion
   * event with the resulting image. Supports preset sizes or explicit width
   * and height.
   */
  generateImageVariation: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string(),
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
      })
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(ctx);

        // Create a unique ID for this generation
        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Resolve imageSize to a concrete {width, height} object
        const resolvedImageSize = resolveImageSize(input.imageSize);
        // Seedream doesn't provide streaming intermediate results, so we just wait for completion
        const result = await falClient.subscribe(
          "fal-ai/bytedance/seedream/v4/edit",
          {
            input: {
              enable_safety_checker: false,
              image_size: resolvedImageSize,
              image_urls: [input.imageUrl],
              num_images: 1,
              prompt: input.prompt,
              ...(input.seed !== undefined ? { seed: input.seed } : {}),
            },
            pollInterval: 1000,
            logs: true,
          }
        );

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
          seed: resultData.seed ?? Math.random(),
        });
      } catch (error) {
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate image variation",
        });
      }
    }),
});

export type AppRouter = typeof appRouter;
