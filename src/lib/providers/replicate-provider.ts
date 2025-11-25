import { toSingleLinePrompt } from "@/lib/fal/helpers";
import { getAspectRatioFromSize } from "@/lib/validation";
import type {
  ImageVariationProvider,
  VariationInput,
  VariationResult,
} from "./types";

/**
 * Replicate provider for image variation generation using Nano Banana Pro.
 */
export class ReplicateProvider implements ImageVariationProvider {
  async generate(input: VariationInput): Promise<VariationResult | Error> {
    const { generateImageWithNanoBananaPro } = await import(
      "@/lib/services/replicate-client"
    );

    const compactPrompt = toSingleLinePrompt(input.prompt);
    const aspectRatio = getAspectRatioFromSize(input.imageSize);

    const result = await generateImageWithNanoBananaPro({
      prompt: compactPrompt,
      image_input: input.imageUrls,
      aspect_ratio: aspectRatio,
      resolution: "1K",
      output_format: "png",
    });

    if (result instanceof Error) {
      return result;
    }

    return {
      imageUrl: result.url,
      replicateUrl: result.replicateUrl,
      provider: "replicate" as const,
    };
  }
}
