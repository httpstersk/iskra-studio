/**
 * Image variation provider abstraction.
 *
 * @remarks
 * This module provides a strategy pattern implementation for different
 * image generation providers, allowing easy switching between FAL, Replicate,
 * and other providers without changing procedure logic.
 */

export { FalProvider } from "./fal-provider";
export { ReplicateProvider } from "./replicate-provider";
export {
  createProvider,
  type ProviderConfig,
  type ProviderType,
} from "./provider-factory";
export type {
  ImageVariationProvider,
  VariationInput,
  VariationResult,
} from "./types";
