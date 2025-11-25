import {
  extractFalErrorMessage,
  extractResultData,
  getFalClient,
} from "@/lib/fal/helpers";
import type { FalImageResult } from "@/lib/fal/types";
import {
  DEFAULT_IMAGE_SIZE_2K_LANDSCAPE,
  resolveImageSize,
  TEXT_TO_IMAGE_ENDPOINT,
} from "@/lib/image-models";
import { z } from "zod";
import { publicProcedure } from "../../init";

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
