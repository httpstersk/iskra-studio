/**
 * Runtime Configuration
 * Centralized configuration management with type safety and validation
 *
 * @module shared/config/runtime
 */

/**
 * Environment variable keys used throughout the application
 */
const ENV_KEYS = {
  CONVEX_URL: "NEXT_PUBLIC_CONVEX_URL",
  CLERK_PUBLISHABLE_KEY: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  NODE_ENV: "NODE_ENV",
} as const;

/**
 * Configuration object with all runtime settings
 */
export const config = {
  /**
   * Whether the app is running in production mode
   */
  isProduction: process.env.NODE_ENV === "production",

  /**
   * Whether the app is running in development mode
   */
  isDevelopment: process.env.NODE_ENV === "development",

  /**
   * Convex backend URL
   */
  convexUrl: process.env[ENV_KEYS.CONVEX_URL] || "",

  /**
   * Clerk authentication publishable key
   */
  clerkPublishableKey: process.env[ENV_KEYS.CLERK_PUBLISHABLE_KEY] || "",

  /**
   * API endpoints for image generation and analysis
   */
  api: {
    analyzeImage: "/api/analyze-image",
    generateConcepts: "/api/generate-concepts",
    falWebhook: "/api/fal-webhook",
  },

  /**
   * Image generation defaults
   */
  imageGeneration: {
    defaultModel: "seedream" as const,
    defaultVariationCount: 4,
    maxVariationCount: 12,
    supportedModels: ["seedream", "nano-banana"] as const,
  },

  /**
   * Storage configuration
   */
  storage: {
    convexImageUrlPrefix: process.env[ENV_KEYS.CONVEX_URL]?.replace(
      /\.cloud$/,
      ".site",
    ),
  },
} as const;

/**
 * Validates that required environment variables are present
 * @throws Error if any required variables are missing
 */
export function validateConfig(): void {
  const missing: string[] = [];

  if (!config.convexUrl) missing.push(ENV_KEYS.CONVEX_URL);
  if (!config.clerkPublishableKey) missing.push(ENV_KEYS.CLERK_PUBLISHABLE_KEY);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

/**
 * Type for supported image generation models
 */
export type ImageModel =
  (typeof config.imageGeneration.supportedModels)[number];

/**
 * Type for variation counts
 */
export type VariationCount = 4 | 8 | 12;
