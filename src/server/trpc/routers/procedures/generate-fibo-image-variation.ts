import { getFiboSeed } from "@/constants/fibo";
import { isErr } from "@/lib/errors/safe-errors";
import { generateImage } from "@/lib/services/bria-client";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../init";

/**
 * Generates image variations using FIBO with structured prompts and director refinement.
 * Accepts FIBO structured JSON + text prompt for director style.
 * Uses official Bria API directly.
 */
export const generateFiboImageVariation = publicProcedure
  .input(
    z.object({
      aspectRatio: z
        .enum([
          "1:1",
          "2:3",
          "3:2",
          "3:4",
          "4:3",
          "4:5",
          "5:4",
          "9:16",
          "16:9",
        ])
        .optional()
        .default("16:9"),
      directorPrompt: z.string().optional(), // Text prompt for director style
      guidanceScale: z.number().optional().default(5),
      imageUrls: z.array(z.string().url()),
      lastEventId: z.string().optional(),
      seed: z.number().optional(),
      stepsNum: z.number().optional().default(50),
      structuredPrompt: z.any(), // FIBO structured JSON
    }),
  )
  .subscription(async function* ({ input, signal, ctx: _ctx }) {
    try {
      const generationId = `fibo_gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Call Bria API to generate image from structured prompt
      // Note: Bria API expects images as an array even for single image
      const result = await generateImage(
        {
          aspect_ratio: input.aspectRatio,
          guidance_scale: input.guidanceScale,
          images: input.imageUrls,
          prompt: input.directorPrompt || "",
          seed: input.seed ?? getFiboSeed(),
          steps_num: input.stepsNum,
          structured_prompt: JSON.stringify(input.structuredPrompt),
          sync: false,
        },
        30000,
      );

      if (isErr(result)) {
        throw result;
      }

      if (signal?.aborted) {
        return;
      }

      // Send the final image
      yield tracked(`${generationId}_complete`, {
        type: "complete",
        imageUrl: result.image_url,
        seed: result.seed,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate FIBO image variation";

      yield tracked(`error_${Date.now()}`, {
        type: "error",
        error: errorMessage,
      });
    }
  });
