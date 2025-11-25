import { sanitizePrompt } from "@/lib/prompt-utils";
import { getVideoModelById, SORA_2_MODEL_ID } from "@/lib/video-models";
import { generateVideoPrompt } from "@/lib/video-prompt-generator";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../init";

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
 * Generates a video from a single input image.
 *
 * Input accepts model selection and rendering parameters and emits tracked
 * events for start, progress, completion, and error states.
 */
export const generateImageToVideo = publicProcedure
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
      .passthrough(),
  )
  .subscription(async function* ({ input, signal: _signal, ctx }) {
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

      // Sanitize user-provided prompt for guidance
      const userGuidance = sanitizePrompt(input.prompt);

      // Generate prompt using AI analysis (optionally guided by user input)
      yield tracked(`${generationId}_analyze`, {
        progress: 20,
        status: userGuidance
          ? "Analyzing image with your creative direction..."
          : "Analyzing image to generate prompt...",
        type: "progress",
      });

      let finalPrompt: string;
      try {
        finalPrompt = await generateVideoPrompt(
          input.imageUrl,
          resolvedDuration,
          userGuidance,
        );

        // Validate the generated prompt
        if (!finalPrompt || finalPrompt.trim().length === 0) {
          throw new Error("Generated prompt is empty");
        }

        yield tracked(`${generationId}_prompt_ready`, {
          progress: 40,
          status: "Prompt generated, starting video generation...",
          type: "progress",
        });
      } catch (promptError) {
        const errorMessage =
          promptError instanceof Error
            ? promptError.message
            : "Failed to generate video prompt";

        yield tracked(`${generationId}_error`, {
          error: `Prompt generation failed: ${errorMessage}`,
          type: "error",
          // No need to return here, let it fall through or handle appropriately
        });
        return;
      }

      // Final validation before sending to FAL
      if (!finalPrompt || finalPrompt.trim().length === 0) {
        yield tracked(`${generationId}_error`, {
          error: "Invalid prompt: prompt cannot be empty",
          type: "error",
        });
        return;
      }

      const soraInput: Record<string, unknown> = {
        aspect_ratio:
          (input as { aspectRatio?: string }).aspectRatio ||
          (model.defaults.aspectRatio as string) ||
          "auto",
        duration: resolvedDuration,
        image_url: input.imageUrl,
        prompt: finalPrompt,
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
        error: extractFalErrorMessage(
          error,
          "Failed to convert image to video",
        ),
        type: "error",
      });
    }
  });
