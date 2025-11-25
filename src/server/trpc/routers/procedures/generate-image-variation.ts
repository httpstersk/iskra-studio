import {
  extractFalErrorMessage,
  extractResultData,
  getFalClient,
  toSingleLinePrompt,
} from "@/lib/fal/helpers";
import type { FalImageResult } from "@/lib/fal/types";
import {
  getImageModelEndpoint,
  IMAGE_MODELS,
  resolveImageSize,
} from "@/lib/image-models";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../init";

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
