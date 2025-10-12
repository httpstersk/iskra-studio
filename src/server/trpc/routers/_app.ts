import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../init";
import {
  resolveFalClient,
  standardRateLimiter,
  videoRateLimiter,
} from "@/lib/fal/utils";

// Type helper for video generation input
type VideoGenerationInput = {
  aspectRatio?: string;
  conditioningType?: string;
  constantRateFactor?: number;
  duration?: number;
  enableSafetyChecker?: boolean;
  expandPrompt?: boolean;
  firstPassNumInferenceSteps?: number;
  firstPassSkipFinalSteps?: number;
  frameRate?: number;
  isVideoExtension?: boolean;
  isVideoToVideo?: boolean;
  limitNumFrames?: boolean;
  maxNumFrames?: number;
  modelId?: string;
  negativePrompt?: string;
  numFrames?: number;
  preprocess?: boolean;
  prompt?: string;
  resampleFps?: boolean;
  resolution?: string;
  reverseVideo?: boolean;
  reverseVideoConditioning?: boolean;
  secondPassNumInferenceSteps?: number;
  secondPassSkipInitialSteps?: number;
  seed?: number;
  startFrameNum?: number;
  strength?: number;
  targetFps?: number;
} & Record<string, unknown>;

// Type helper for API responses
type ApiResponse = {
  data?: {
    video?: { url?: string };
    url?: string;
    images?: Array<{ url?: string }>;
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

import { getVideoModelById, VIDEO_MODELS } from "@/lib/video-models";

export const appRouter = router({
  transformVideo: publicProcedure
    .input(
      z.object({
        videoUrl: z.string().url(),
        prompt: z.string().optional(),
        styleId: z.string().optional(),
        apiKey: z.string().optional(),
      })
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx, true);

        // Create a unique ID for this transformation
        const transformationId = `vidtrans_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${transformationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting video transformation...",
        });

        // Start streaming from fal.ai
        const stream = await falClient.stream(
          VIDEO_MODELS["stable-video-diffusion"].endpoint,
          {
            input: {
              video_url: input.videoUrl,
              prompt: input.prompt || "",
              style: input.styleId || "",
              num_inference_steps: 25,
              guidance_scale: 7.5,
            },
          }
        );

        let eventIndex = 0;

        // Stream events as they come
        for await (const event of stream) {
          if (signal?.aborted) {
            break;
          }

          const eventId = `${transformationId}_${eventIndex++}`;

          // Calculate progress percentage if available
          const progress =
            event.progress !== undefined
              ? Math.floor(event.progress * 100)
              : eventIndex * 5; // Fallback progress estimation

          yield tracked(eventId, {
            type: "progress",
            progress,
            status: event.status || "Transforming video...",
            data: event,
          });
        }

        // Get the final result
        const result = await stream.done();

        // Handle different response formats
        const videoUrl =
          (result as ApiResponse).data?.video?.url ||
          (result as ApiResponse).data?.url ||
          (result as ApiResponse).video_url;
        if (!videoUrl) {
          yield tracked(`${transformationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Send the final video
        yield tracked(`${transformationId}_complete`, {
          type: "complete",
          videoUrl: videoUrl,
          duration: (result as ApiResponse).duration || 3, // Default to 3 seconds if not provided
        });
      } catch (error) {
        console.error("Error in video transformation:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to transform video",
        });
      }
    }),
  generateImageToVideo: publicProcedure
    .input(
      z
        .object({
          imageUrl: z.string().url(),
          prompt: z.string().optional(),
          duration: z.number().optional().default(5),
          modelId: z.string().optional(),
          resolution: z
            .enum(["480p", "720p", "1080p"])
            .optional()
            .default("720p"),
          cameraFixed: z.boolean().optional().default(false),
          seed: z.number().optional().default(-1),
          apiKey: z.string().optional(),
        })
        .passthrough() // Allow additional fields for different models
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx, true);

        // Create a unique ID for this generation
        const generationId = `img2vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${generationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting image-to-video conversion...",
        });

        // Use subscribe instead of stream for SeeDANCE model
        // First yield a progress update to show we're starting
        yield tracked(`${generationId}_starting`, {
          type: "progress",
          progress: 10,
          status: "Starting video generation...",
        });

        // Call the SeeDANCE API using subscribe method
        // Convert duration to one of the allowed values: "5" or "10"
        const duration = input.duration <= 5 ? "5" : "10";

        // Ensure prompt is descriptive enough
        const prompt =
          input.prompt || "A smooth animation of the image with natural motion";

        // Determine model from modelId or use default
        const modelId = input.modelId || "ltx-video"; // Default to ltx-video
        const model = getVideoModelById(modelId);
        if (!model) {
          throw new Error(`Unknown model ID: ${modelId}`);
        }
        const modelEndpoint = model.endpoint;

        // Build input parameters based on model configuration
        let inputParams: Record<string, unknown> = {};
        const typedInput = input as VideoGenerationInput;

        if (input.modelId) {
          const model = getVideoModelById(input.modelId);
          if (model) {
            // Map our generic field names to model-specific field names
            if (model.id === "ltx-video-extend") {
              // Use the dedicated extend endpoint format
              let startFrame = typedInput.startFrameNum ?? 32;

              // Ensure startFrame is a multiple of 8
              if (startFrame % 8 !== 0) {
                // Round to nearest multiple of 8
                startFrame = Math.round(startFrame / 8) * 8;
                console.log(
                  `Adjusted start frame from ${typedInput.startFrameNum} to ${startFrame} (must be multiple of 8)`
                );
              }

              inputParams = {
                video: {
                  video_url: input.imageUrl, // imageUrl contains the video URL for extension
                  // Use the validated startFrame (already defaulted and rounded)
                  start_frame_num: startFrame,
                  reverse_video: typedInput.reverseVideoConditioning ?? false,
                  limit_num_frames: typedInput.limitNumFrames ?? false,
                  resample_fps: typedInput.resampleFps ?? false,
                  strength: typedInput.strength ?? 1,
                  target_fps: typedInput.targetFps ?? 30,
                  max_num_frames: typedInput.maxNumFrames ?? 121,
                  conditioning_type: typedInput.conditioningType ?? "rgb",
                  preprocess: typedInput.preprocess ?? false,
                },
                prompt: input.prompt || model.defaults.prompt,
                negative_prompt:
                  typedInput.negativePrompt || model.defaults.negativePrompt,
                resolution: input.resolution || model.defaults.resolution,
                aspect_ratio:
                  typedInput.aspectRatio || model.defaults.aspectRatio,
                num_frames: typedInput.numFrames || model.defaults.numFrames,
                first_pass_num_inference_steps:
                  typedInput.firstPassNumInferenceSteps || 30,
                first_pass_skip_final_steps:
                  typedInput.firstPassSkipFinalSteps || 3,
                second_pass_num_inference_steps:
                  typedInput.secondPassNumInferenceSteps || 30,
                second_pass_skip_initial_steps:
                  typedInput.secondPassSkipInitialSteps || 17,
                frame_rate: typedInput.frameRate || model.defaults.frameRate,
                expand_prompt:
                  typedInput.expandPrompt ?? model.defaults.expandPrompt,
                reverse_video:
                  typedInput.reverseVideo ?? model.defaults.reverseVideo,
                enable_safety_checker:
                  typedInput.enableSafetyChecker ??
                  model.defaults.enableSafetyChecker,
                constant_rate_factor:
                  typedInput.constantRateFactor ||
                  model.defaults.constantRateFactor,
                seed:
                  input.seed !== undefined && input.seed !== -1
                    ? input.seed
                    : undefined,
              };
            } else if (model.id === "ltx-video-multiconditioning") {
              // Handle multiconditioning model with support for video-to-video
              const isVideoToVideo = typedInput.isVideoToVideo;
              const isVideoExtension = typedInput.isVideoExtension;

              inputParams = {
                prompt: input.prompt || "",
                negative_prompt:
                  typedInput.negativePrompt || model.defaults.negativePrompt,
                resolution: input.resolution || model.defaults.resolution,
                aspect_ratio:
                  (input as any).aspectRatio || model.defaults.aspectRatio,
                num_frames:
                  (input as any).numFrames || model.defaults.numFrames,
                frame_rate:
                  (input as any).frameRate || model.defaults.frameRate,
                first_pass_num_inference_steps:
                  (input as any).firstPassNumInferenceSteps ||
                  model.defaults.firstPassNumInferenceSteps,
                first_pass_skip_final_steps:
                  (input as any).firstPassSkipFinalSteps ||
                  model.defaults.firstPassSkipFinalSteps,
                second_pass_num_inference_steps:
                  (input as any).secondPassNumInferenceSteps ||
                  model.defaults.secondPassNumInferenceSteps,
                second_pass_skip_initial_steps:
                  (input as any).secondPassSkipInitialSteps ||
                  model.defaults.secondPassSkipInitialSteps,
                expand_prompt:
                  (input as any).expandPrompt ?? model.defaults.expandPrompt,
                reverse_video:
                  (input as any).reverseVideo ?? model.defaults.reverseVideo,
                enable_safety_checker:
                  (input as any).enableSafetyChecker ??
                  model.defaults.enableSafetyChecker,
                constant_rate_factor:
                  (input as any).constantRateFactor ||
                  model.defaults.constantRateFactor,
                seed:
                  input.seed !== undefined && input.seed !== -1
                    ? input.seed
                    : undefined,
              };

              // Add image or video conditioning based on the type
              if (isVideoToVideo) {
                if (isVideoExtension) {
                  // For video extension, use conditioning that focuses on the end of the video
                  inputParams.videos = [
                    {
                      video_url: input.imageUrl, // imageUrl contains the video URL
                      conditioning_type: "rgb",
                      preprocess: true,
                      start_frame_num: 24, // Use frames from near the end
                      strength: 1,
                      limit_num_frames: true,
                      max_num_frames: 121,
                      resample_fps: true,
                      target_fps: 30,
                      reverse_video: false,
                    },
                  ];
                  // Modify prompt to indicate continuation
                  if (
                    inputParams.prompt &&
                    !(inputParams.prompt as string)
                      .toLowerCase()
                      .includes("continue") &&
                    !(inputParams.prompt as string)
                      .toLowerCase()
                      .includes("extend")
                  ) {
                    inputParams.prompt =
                      "Continue this video naturally. " +
                      (inputParams.prompt as string);
                  }
                } else {
                  // Regular video-to-video transformation
                  inputParams.videos = [
                    {
                      video_url: input.imageUrl, // imageUrl contains the video URL
                      start_frame_num: 0,
                      end_frame_num: -1, // Use all frames
                    },
                  ];
                }
              } else {
                inputParams.images = [
                  {
                    image_url: input.imageUrl,
                    strength: 1.0,
                    start_frame_num: 0,
                  },
                ];
              }
            } else if (model.id === "ltx-video") {
              inputParams = {
                image_url: input.imageUrl,
                prompt: input.prompt || "",
                negative_prompt:
                  typedInput.negativePrompt || model.defaults.negativePrompt,
                resolution: input.resolution || model.defaults.resolution,
                aspect_ratio:
                  (input as any).aspectRatio || model.defaults.aspectRatio,
                num_frames:
                  (input as any).numFrames || model.defaults.numFrames,
                frame_rate:
                  (input as any).frameRate || model.defaults.frameRate,
                expand_prompt:
                  (input as any).expandPrompt ?? model.defaults.expandPrompt,
                reverse_video:
                  (input as any).reverseVideo ?? model.defaults.reverseVideo,
                constant_rate_factor:
                  (input as any).constantRateFactor ||
                  model.defaults.constantRateFactor,
                seed:
                  input.seed !== undefined && input.seed !== -1
                    ? input.seed
                    : undefined,
                enable_safety_checker: true,
              };
            } else {
              // SeeDANCE models and others
              inputParams = {
                image_url: input.imageUrl,
                prompt: input.prompt || prompt,
                duration: duration || input.duration,
                resolution: input.resolution,
                camera_fixed:
                  input.cameraFixed !== undefined ? input.cameraFixed : false,
                seed: input.seed !== undefined ? input.seed : -1,
              };
            }
          }
        } else {
          // Backward compatibility
          inputParams = {
            image_url: input.imageUrl,
            prompt: prompt,
            duration: duration,
            resolution: input.resolution,
            camera_fixed:
              input.cameraFixed !== undefined ? input.cameraFixed : false,
            seed: input.seed !== undefined ? input.seed : -1,
          };
        }

        console.log(
          `Calling ${modelEndpoint} with parameters:`,
          JSON.stringify(inputParams, null, 2)
        );

        let result;
        try {
          result = await falClient.subscribe(modelEndpoint, {
            input: inputParams,
          });
        } catch (apiError: unknown) {
          const error = apiError as {
            message?: string;
            status?: string;
            statusText?: string;
            body?: string;
          };
          console.error("FAL API Error Details:", {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            body: error.body,
            response: apiError,
            data: apiError,
            // Log the exact parameters that were sent
            sentParameters: inputParams,
            endpoint: modelEndpoint,
          });

          // Log specific validation errors if available
          if ((apiError as { body?: { detail?: unknown } }).body?.detail) {
            console.error(
              "Validation error details:",
              (apiError as { body?: { detail?: unknown } }).body?.detail
            );
          }

          // Re-throw with more context
          if (
            (apiError as { status?: number }).status === 422 ||
            (apiError as { message?: string }).message?.includes(
              "Unprocessable Entity"
            )
          ) {
            let errorDetail =
              (apiError as { body?: { detail?: unknown } }).body?.detail ||
              (apiError as { message?: string }).message ||
              "Please check the video format and parameters";
            // If errorDetail is an object, stringify it
            if (typeof errorDetail === "object") {
              errorDetail = JSON.stringify(errorDetail);
            }
            throw new Error(
              `Invalid parameters for ${modelEndpoint}: ${errorDetail}`
            );
          }
          throw apiError;
        }

        // Yield progress update
        yield tracked(`${generationId}_progress`, {
          type: "progress",
          progress: 100,
          status: "Video generation complete",
        });

        // Handle different response formats from different models
        const videoUrl =
          result.data?.video?.url ||
          result.data?.url ||
          (result as ApiResponse).video?.url ||
          (result as ApiResponse).url;
        if (!videoUrl) {
          console.error("No video URL found in response:", result);
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Extract duration from response or use input value
        const videoDuration = result.data?.duration || input.duration || 5;

        // Send the final video
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          videoUrl: videoUrl,
          duration: videoDuration,
        });
      } catch (error) {
        console.error("Error in image-to-video conversion:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to convert image to video",
        });
      }
    }),

  generateTextToVideo: publicProcedure
    .input(
      z.object({
        prompt: z.string(),
        duration: z.number().optional().default(3),
        styleId: z.string().optional(),
        apiKey: z.string().optional(),
      })
    )
    .subscription(async function* ({ input, signal, ctx }) {
      try {
        const falClient = await getFalClient(input.apiKey, ctx, true);

        // Create a unique ID for this generation
        const generationId = `vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Yield initial progress
        yield tracked(`${generationId}_start`, {
          type: "progress",
          progress: 0,
          status: "Starting video generation...",
        });

        // Start streaming from fal.ai
        const stream = await falClient.stream(
          VIDEO_MODELS["stable-video-diffusion"].endpoint,
          {
            input: {
              prompt: input.prompt,
              num_frames: Math.floor(input.duration * 24), // Convert seconds to frames at 24fps
              num_inference_steps: 25,
              guidance_scale: 7.5,
              width: 576,
              height: 320,
              fps: 24,
              motion_bucket_id: 127, // Higher values = more motion
              seed: Math.floor(Math.random() * 2147483647),
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

          // Calculate progress percentage if available
          const progress =
            event.progress !== undefined
              ? Math.floor(event.progress * 100)
              : eventIndex * 5; // Fallback progress estimation

          yield tracked(eventId, {
            type: "progress",
            progress,
            status: event.status || "Generating video...",
            data: event,
          });
        }

        // Get the final result
        const result = await stream.done();

        // Handle different response formats
        const videoUrl =
          (result as ApiResponse).data?.video?.url ||
          (result as ApiResponse).data?.url ||
          (result as ApiResponse).video_url;
        if (!videoUrl) {
          yield tracked(`${generationId}_error`, {
            type: "error",
            error: "No video generated",
          });
          return;
        }

        // Send the final video
        yield tracked(`${generationId}_complete`, {
          type: "complete",
          videoUrl: videoUrl,
          duration: input.duration,
        });
      } catch (error) {
        console.error("Error in text-to-video generation:", error);
        yield tracked(`error_${Date.now()}`, {
          type: "error",
          error:
            error instanceof Error ? error.message : "Failed to generate video",
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
