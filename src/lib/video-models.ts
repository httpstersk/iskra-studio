/**
 * Literal identifiers for Sora models.
 */
export const SORA_1_MODEL_ID = "sora-1" as const;
export const SORA_2_MODEL_ID = "sora-2" as const;
export const SORA_2_PRO_MODEL_ID = "sora-2-pro" as const;

const SORA_1_COPY = {
  ENDPOINT: "fal-ai/sora/image-to-video",
  NAME: "Sora 1",
  PRICING_UNIT: "video (4s)",
} as const;

const SORA_2_COPY = {
  ENDPOINT: "fal-ai/sora-2/image-to-video",
  NAME: "Sora 2",
  PRICING_UNIT: "video (4s)",
} as const;

const SORA_2_PRO_COPY = {
  ENDPOINT: "fal-ai/sora-2/image-to-video/pro",
  NAME: "Sora 2 Pro",
  PRICING_UNIT: "video (4s)",
} as const;

const SORA_COPY = {
  ASPECT_RATIO_AUTO: "Auto (from image)",
  ASPECT_RATIO_DESCRIPTION: "Select the aspect ratio for the generated video",
  ASPECT_RATIO_LABEL: "Aspect Ratio",
  ASPECT_RATIO_PORTRAIT: "9:16 (Portrait)",
  ASPECT_RATIO_WIDESCREEN: "16:9 (Landscape)",
  CATEGORY: "image-to-video",
  DURATION_EIGHT_SECONDS: "8 seconds",
  DURATION_FOUR_SECONDS: "4 seconds",
  DURATION_LABEL: "Duration",
  DURATION_TWELVE_SECONDS: "12 seconds",
  DURATION_WARNING: "Duration of the generated video in seconds",
  OPTION_DESCRIPTION:
    "Describe the motion, action, and camera movement for the video",
  PLACEHOLDER:
    "Camera slowly zooms in while the subject looks around...",
  PROMPT_LABEL: "Prompt",
  RESOLUTION_AUTO: "Auto (from image)",
  RESOLUTION_DESCRIPTION: "Select the resolution for the generated video",
  RESOLUTION_LABEL: "Resolution",
  RESOLUTION_P720: "720p",
} as const;

/**
 * Shape of a selectable model option exposed to the UI.
 */
export interface VideoModelOption {
  default?: string | number | boolean;
  description?: string;
  label: string;
  max?: number;
  min?: number;
  name: string;
  options?: Array<{ label: string; value: string | number }>;
  placeholder?: string;
  required?: boolean;
  step?: number;
  type: "boolean" | "number" | "select" | "text";
}

/**
 * Constraints that can be applied to a model configuration.
 */
export interface ModelConstraints {
  conditionalOptions?: Array<{
    then: { field: string; value: string | number | boolean };
    when: { field: string; value: string | number | boolean };
  }>;
  resolutionsByModel?: Record<string, string[]>;
}

/**
 * Pricing metadata for a model configuration.
 */
export interface VideoModelPricing {
  costPerVideo: number;
  currency: string;
  unit: string;
}

/**
 * Model configuration exposed to the rest of the application.
 */
export interface VideoModelConfig {
  category: "image-to-video";
  defaults: Record<string, unknown>;
  endpoint: string;
  id: string;
  isDefault?: boolean;
  name: string;
  options: Record<string, VideoModelOption>;
  pricing: VideoModelPricing;
}

/**
 * Registry of enabled video models keyed by identifier.
 */
export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  [SORA_1_MODEL_ID]: {
    category: SORA_COPY.CATEGORY,
    defaults: {
      aspectRatio: "auto",
      duration: "4",
      prompt: "",
      resolution: "auto",
    },
    endpoint: SORA_1_COPY.ENDPOINT,
    id: SORA_1_MODEL_ID,
    isDefault: false,
    name: SORA_1_COPY.NAME,
    options: {
      aspectRatio: {
        description: SORA_COPY.ASPECT_RATIO_DESCRIPTION,
        label: SORA_COPY.ASPECT_RATIO_LABEL,
        name: "aspectRatio",
        options: [
          { label: SORA_COPY.ASPECT_RATIO_AUTO, value: "auto" },
          { label: SORA_COPY.ASPECT_RATIO_PORTRAIT, value: "9:16" },
          { label: SORA_COPY.ASPECT_RATIO_WIDESCREEN, value: "16:9" },
        ],
        type: "select",
      },
      duration: {
        default: "4",
        description: SORA_COPY.DURATION_WARNING,
        label: SORA_COPY.DURATION_LABEL,
        name: "duration",
        options: [
          { label: SORA_COPY.DURATION_FOUR_SECONDS, value: "4" },
          { label: SORA_COPY.DURATION_EIGHT_SECONDS, value: "8" },
          { label: SORA_COPY.DURATION_TWELVE_SECONDS, value: "12" },
        ],
        type: "select",
      },
      prompt: {
        description: SORA_COPY.OPTION_DESCRIPTION,
        label: SORA_COPY.PROMPT_LABEL,
        name: "prompt",
        placeholder: SORA_COPY.PLACEHOLDER,
        required: true,
        type: "text",
      },
      resolution: {
        default: "auto",
        description: SORA_COPY.RESOLUTION_DESCRIPTION,
        label: SORA_COPY.RESOLUTION_LABEL,
        name: "resolution",
        options: [
          { label: SORA_COPY.RESOLUTION_AUTO, value: "auto" },
          { label: SORA_COPY.RESOLUTION_P720, value: "720p" },
        ],
        type: "select",
      },
    },
    pricing: {
      costPerVideo: 0.3,
      currency: "USD",
      unit: SORA_1_COPY.PRICING_UNIT,
    },
  },
  [SORA_2_MODEL_ID]: {
    category: SORA_COPY.CATEGORY,
    defaults: {
      aspectRatio: "auto",
      duration: "4",
      prompt: "",
      resolution: "auto",
    },
    endpoint: SORA_2_COPY.ENDPOINT,
    id: SORA_2_MODEL_ID,
    isDefault: true,
    name: SORA_2_COPY.NAME,
    options: {
      aspectRatio: {
        description: SORA_COPY.ASPECT_RATIO_DESCRIPTION,
        label: SORA_COPY.ASPECT_RATIO_LABEL,
        name: "aspectRatio",
        options: [
          { label: SORA_COPY.ASPECT_RATIO_AUTO, value: "auto" },
          { label: SORA_COPY.ASPECT_RATIO_PORTRAIT, value: "9:16" },
          { label: SORA_COPY.ASPECT_RATIO_WIDESCREEN, value: "16:9" },
        ],
        type: "select",
      },
      duration: {
        default: "4",
        description: SORA_COPY.DURATION_WARNING,
        label: SORA_COPY.DURATION_LABEL,
        name: "duration",
        options: [
          { label: SORA_COPY.DURATION_FOUR_SECONDS, value: "4" },
          { label: SORA_COPY.DURATION_EIGHT_SECONDS, value: "8" },
          { label: SORA_COPY.DURATION_TWELVE_SECONDS, value: "12" },
        ],
        type: "select",
      },
      prompt: {
        description: SORA_COPY.OPTION_DESCRIPTION,
        label: SORA_COPY.PROMPT_LABEL,
        name: "prompt",
        placeholder: SORA_COPY.PLACEHOLDER,
        required: true,
        type: "text",
      },
      resolution: {
        default: "auto",
        description: SORA_COPY.RESOLUTION_DESCRIPTION,
        label: SORA_COPY.RESOLUTION_LABEL,
        name: "resolution",
        options: [
          { label: SORA_COPY.RESOLUTION_AUTO, value: "auto" },
          { label: SORA_COPY.RESOLUTION_P720, value: "720p" },
        ],
        type: "select",
      },
    },
    pricing: {
      costPerVideo: 0.4,
      currency: "USD",
      unit: SORA_2_COPY.PRICING_UNIT,
    },
  },
  [SORA_2_PRO_MODEL_ID]: {
    category: SORA_COPY.CATEGORY,
    defaults: {
      aspectRatio: "auto",
      duration: "4",
      prompt: "",
      resolution: "auto",
    },
    endpoint: SORA_2_PRO_COPY.ENDPOINT,
    id: SORA_2_PRO_MODEL_ID,
    isDefault: false,
    name: SORA_2_PRO_COPY.NAME,
    options: {
      aspectRatio: {
        description: SORA_COPY.ASPECT_RATIO_DESCRIPTION,
        label: SORA_COPY.ASPECT_RATIO_LABEL,
        name: "aspectRatio",
        options: [
          { label: SORA_COPY.ASPECT_RATIO_AUTO, value: "auto" },
          { label: SORA_COPY.ASPECT_RATIO_PORTRAIT, value: "9:16" },
          { label: SORA_COPY.ASPECT_RATIO_WIDESCREEN, value: "16:9" },
        ],
        type: "select",
      },
      duration: {
        default: "4",
        description: SORA_COPY.DURATION_WARNING,
        label: SORA_COPY.DURATION_LABEL,
        name: "duration",
        options: [
          { label: SORA_COPY.DURATION_FOUR_SECONDS, value: "4" },
          { label: SORA_COPY.DURATION_EIGHT_SECONDS, value: "8" },
          { label: SORA_COPY.DURATION_TWELVE_SECONDS, value: "12" },
        ],
        type: "select",
      },
      prompt: {
        description: SORA_COPY.OPTION_DESCRIPTION,
        label: SORA_COPY.PROMPT_LABEL,
        name: "prompt",
        placeholder: SORA_COPY.PLACEHOLDER,
        required: true,
        type: "text",
      },
      resolution: {
        default: "auto",
        description: SORA_COPY.RESOLUTION_DESCRIPTION,
        label: SORA_COPY.RESOLUTION_LABEL,
        name: "resolution",
        options: [
          { label: SORA_COPY.RESOLUTION_AUTO, value: "auto" },
          { label: SORA_COPY.RESOLUTION_P720, value: "720p" },
        ],
        type: "select",
      },
    },
    pricing: {
      costPerVideo: 0.6,
      currency: "USD",
      unit: SORA_2_PRO_COPY.PRICING_UNIT,
    },
  },
};

/**
 * Retrieves a model configuration by identifier.
 */
export function getVideoModelById(id: string): VideoModelConfig | undefined {
  return VIDEO_MODELS[id];
}

/**
 * Returns all models for the configured category.
 */
export function getVideoModelsByCategory(
  category: VideoModelConfig["category"]
): VideoModelConfig[] {
  return Object.values(VIDEO_MODELS).filter(
    (model) => model.category === category
  );
}

/**
 * Retrieves the default model for a category.
 */
export function getDefaultVideoModel(
  category: VideoModelConfig["category"]
): VideoModelConfig | undefined {
  const models = getVideoModelsByCategory(category);
  return models.find((model) => model.isDefault) || models[0];
}

/**
 * Calculates how many generations fit within the provided budget.
 */
export function calculateVideoGenerations(
  model: VideoModelConfig,
  budget: number = 1
): number {
  return Math.floor(budget / model.pricing.costPerVideo);
}

/**
 * Formats a user-friendly price message for display.
 */
export function formatPricingMessage(model: VideoModelConfig): string {
  const approximateTimes = calculateVideoGenerations(model);
  return `Your request will cost $${model.pricing.costPerVideo.toFixed(2)} per ${
    model.pricing.unit
  }. For $1 you can run this model approximately ${approximateTimes} times.`;
}
