import type { FalClient } from "@fal-ai/client";
import { extractFirstImageUrl, toSingleLinePrompt } from "@/lib/fal/helpers";
import { extractResultData } from "@/lib/fal/response";
import type { FalImageResult } from "@/lib/fal/types";
import {
  getImageModelEndpoint,
  IMAGE_MODELS,
  type ImageModelId,
} from "@/lib/image-models";
import type {
  ImageVariationProvider,
  VariationInput,
  VariationResult,
} from "./types";

/**
 * FAL.ai provider for image variation generation.
 * Supports both Seedream and Nano Banana models.
 */
export class FalProvider implements ImageVariationProvider {
  constructor(
    private falClient: FalClient,
    private model: ImageModelId = IMAGE_MODELS.SEEDREAM,
  ) {}

  async generate(input: VariationInput): Promise<VariationResult | Error> {
    const compactPrompt = toSingleLinePrompt(input.prompt);
    const endpoint = getImageModelEndpoint(this.model);

    // Build input based on model - Nano Banana and Seedream have different schemas
    const nanoBananaAspectRatio =
      input.imageSize.height > input.imageSize.width ? "9:16" : "16:9";

    const falInput =
      this.model === IMAGE_MODELS.NANO_BANANA
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
            image_size: input.imageSize,
            image_urls: input.imageUrls,
            num_images: 1,
            prompt: compactPrompt,
            ...(input.seed !== undefined ? { seed: input.seed } : {}),
          };

    try {
      // Subscribe to the model endpoint and wait for completion
      const result = await this.falClient.subscribe(endpoint, {
        input: falInput,
        pollInterval: 500, // Reduced from 1000ms for 2x faster completion detection
        logs: true,
      });

      const resultData = extractResultData<FalImageResult>(result) ?? {
        images: [],
      };
      const imageUrl = extractFirstImageUrl(result);

      if (!imageUrl) {
        return new Error("No image generated");
      }

      return {
        imageUrl,
        provider: "fal" as const,
        seed: resultData.seed ?? Math.random(),
      };
    } catch (error) {
      return error instanceof Error
        ? error
        : new Error("Failed to generate image variation");
    }
  }
}
