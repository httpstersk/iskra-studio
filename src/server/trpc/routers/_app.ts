import {
  resolveFalClient,
  standardRateLimiter,
  videoRateLimiter,
} from "@/lib/fal/utils";
import { getVideoModelById, SORA_2_MODEL_ID } from "@/lib/video-models";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../init";

// Type helper for API responses
type ApiResponse = {
  data?: {
    video?: { url?: string };
    url?: string;
    images?: Array<{ url?: string }>;
    duration?: number;
  };
  video_url?: string;
  video?: { url?: string };
  duration?: number;
  [key: string]: unknown;
} & Record<string, unknown>;

// Helper function to check rate limits or use custom API key
async function getFalClient(
  apiKey: string | undefined,
  ctx: { req?: any; user?: { id: string } },
  isVideo: boolean = false
) {
  const headersSource =
    ctx.req?.headers instanceof Headers ? ctx.req.headers : ctx.req?.headers;

  const resolved = await resolveFalClient({
    apiKey,
    limiter: isVideo ? videoRateLimiter : standardRateLimiter,
    headers: headersSource,
    bucketId: isVideo ? "video" : undefined,
    fallbackIp: typeof ctx.req?.ip === "string" ? ctx.req.ip : undefined,
  });

  if (resolved.limited) {
    const errorMessage = isVideo
      ? `Video generation rate limit exceeded: 1 video per ${resolved.period}. Add your FAL API key to bypass rate limits.`
      : `Rate limit exceeded per ${resolved.period}. Add your FAL API key to bypass rate limits.`;
    throw new Error(errorMessage);
  }

  return resolved.client;
}

// Helper function to download image
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export const appRouter = router({
  generateImageToVideo: publicProcedure
    .input(
      z
        .object({
          apiKey: z.string().optional(),
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
        console.log("tRPC generateImageToVideo - Input received:", input);
        
        const falClient = await getFalClient(input.apiKey, ctx, true);
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

        console.log("tRPC generateImageToVideo - Model selected:", {
          modelId: model.id,
          modelName: model.name,
          endpoint: model.endpoint,
        });

        const resolvedDuration =
          typeof input.duration === "string"
            ? parseInt(input.duration, 10)
            : input.duration ?? 4;

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

        console.log("tRPC generateImageToVideo - Calling FAL with:", {
          endpoint: model.endpoint,
          input: soraInput,
        });

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
        console.error("Error in image-to-video conversion:", error);
        yield tracked(`error_${Date.now()}`, {
          error:
            error instanceof Error
              ? error.message
              : "Failed to convert image to video",
          type: "error",
        });
      }
    }),
  generateTextToImage: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        seed: z.number().optional(),
        imageSize: z
          .enum([
            "landscape_4_3",
            "portrait_4_3",
            "square",
            "landscape_16_9",
            "portrait_16_9",
          ])
          .optional(),
        apiKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

        const result = await falClient.subscribe("fal-ai/flux/dev", {
          input: {
            prompt: input.prompt,
            image_size: input.imageSize || "square",
            num_inference_steps: 4,
            num_images: 1,
            enable_safety_checker: true,
            output_format: "png",
            seed: input.seed,
          },
        });

        // Handle different possible response structures
        const resultData = (result as ApiResponse).data || result;
        const images = (resultData as any).images || [];
        if (!images[0]) {
          throw new Error("No image generated");
        }

        return {
          url: images[0].url || "",
          width: (images[0] as any).width || 512,
          height: (images[0] as any).height || 512,
          seed: (resultData as any).seed || Math.random(),
        };
      } catch (error) {
        console.error("Error in text-to-image generation:", error);
        throw new Error(
          error instanceof Error ? error.message : "Failed to generate image"
        );
      }
    }),

  generateImageStream: publicProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string(),
        seed: z.number().optional(),
        lastEventId: z.string().optional(),
        apiKey: z.string().optional(),
      })
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

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
        const resultData = (result as ApiResponse).data || result;
        const images = (resultData as any).images || [];
        if (!images?.[0]) {
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
          seed: (resultData as any).seed || Math.random(),
        });
      } catch (error) {
        console.error("Error in image generation stream:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error ? error.message : "Failed to generate image",
        });
      }
    }),

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
        apiKey: z.string().optional(),
      })
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx);

        // Create a unique ID for this generation
        const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Map preset strings to concrete dimensions
        const presetToDimensions: Record<
          string,
          { width: number; height: number }
        > = {
          landscape_16_9: { width: 3840, height: 2160 },
          portrait_16_9: { width: 2160, height: 3840 },
          landscape_4_3: { width: 3840, height: 2880 },
          portrait_4_3: { width: 2880, height: 3840 },
          square: { width: 3840, height: 3840 },
        };

        // Resolve imageSize to a concrete {width, height} object
        let resolvedImageSize: { width: number; height: number };
        if (typeof input.imageSize === "string") {
          // Map preset string to dimensions
          resolvedImageSize = presetToDimensions[input.imageSize] || {
            width: 3840,
            height: 2160,
          };
        } else if (input.imageSize && typeof input.imageSize === "object") {
          // Already an object, validate it has width and height
          resolvedImageSize = {
            width: input.imageSize.width || 3840,
            height: input.imageSize.height || 2160,
          };
        } else {
          // Fallback to default landscape 4K
          resolvedImageSize = { width: 3840, height: 2160 };
        }

        // Use subscribe to wait for final result
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
        const resultData = (result as ApiResponse).data || result;
        const images = (resultData as any).images || [];
        if (!images?.[0]) {
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
          seed: (resultData as any).seed || Math.random(),
        });
      } catch (error) {
        console.error("Error in image variation stream:", error);
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
