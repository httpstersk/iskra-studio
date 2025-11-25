import {
  extractFalErrorMessage,
  extractResultData,
  getFalClient,
} from "@/lib/fal/helpers";
import type { FalImageResult } from "@/lib/fal/types";
import { tracked } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "../../init";

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
