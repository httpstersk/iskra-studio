import {
  extractFirstImageUrl,
  extractResultData,
  getFalClient,
} from "@/lib/fal/helpers";
import type { FalImageResult } from "@/lib/fal/types";
import {
  generateId,
  yieldComplete,
  yieldCustom,
  yieldError,
} from "@/lib/trpc/event-tracking";
import { handleFalError } from "@/lib/trpc/error-handling";
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
      const generationId = generateId();

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

        yield yieldCustom(eventId, {
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
      const imageUrl = extractFirstImageUrl(result);
      if (!imageUrl) {
        yield yieldError(generationId, "No image generated");
        return;
      }

      // Send the final image
      yield yieldComplete(generationId, {
        imageUrl,
        seed: resultData.seed ?? Math.random(),
      });
    } catch (error) {
      yield handleFalError(error, "Failed to generate image");
    }
  });
