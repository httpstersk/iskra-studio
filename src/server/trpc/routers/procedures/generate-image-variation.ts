import { extractFalErrorMessage, getFalClient } from "@/lib/fal/helpers";
import { IMAGE_MODELS, resolveImageSize } from "@/lib/image-models";
import { createProvider } from "@/lib/providers";
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

      // Create the appropriate provider
      const falClient =
        input.provider === "fal" ? await getFalClient(ctx) : undefined;

      const provider = createProvider({
        type: input.provider,
        falClient,
        model: input.model,
      });

      // Generate the image variation
      const result = await provider.generate({
        imageUrls: input.imageUrls,
        prompt: input.prompt,
        imageSize: resolvedImageSize,
        seed: input.seed,
        model: input.model,
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

      // Send the final image
      yield tracked(`${generationId}_complete`, {
        type: "complete",
        imageUrl: result.imageUrl,
        provider: result.provider,
        ...(result.seed !== undefined ? { seed: result.seed } : {}),
        ...(result.replicateUrl
          ? { replicateUrl: result.replicateUrl }
          : {}),
      });
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
