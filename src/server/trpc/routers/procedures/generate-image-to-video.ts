import { extractFalErrorMessage, getFalClient } from "@/lib/fal/helpers";
import type { ApiResponse } from "@/lib/fal/types";
import { sanitizePrompt } from "@/lib/prompt-utils";
import { getVideoModelById, SORA_2_MODEL_ID } from "@/lib/video-models";
import { generateVideoPrompt } from "@/lib/video-prompt-generator";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../init";

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
