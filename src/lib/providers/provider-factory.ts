import type { FalClient } from "@fal-ai/client";
import type { ImageModelId } from "@/lib/image-models";
import { FalProvider } from "./fal-provider";
import { ReplicateProvider } from "./replicate-provider";
import type { ImageVariationProvider } from "./types";

/**
 * Provider type identifier.
 */
export type ProviderType = "fal" | "replicate";

/**
 * Configuration for provider instantiation.
 */
export interface ProviderConfig {
  type: ProviderType;
  falClient?: FalClient;
  model?: ImageModelId;
}

/**
 * Factory for creating image variation providers.
 *
 * @param config - Provider configuration
 * @returns An instance of the requested provider
 * @throws Error if required dependencies are missing
 */
export function createProvider(
  config: ProviderConfig,
): ImageVariationProvider {
  switch (config.type) {
    case "replicate":
      return new ReplicateProvider();

    case "fal":
      if (!config.falClient) {
        throw new Error("FAL client is required for FAL provider");
      }
      return new FalProvider(config.falClient, config.model);

    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}
