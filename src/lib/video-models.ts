/**
 * Model identifiers
 */
export const SORA_2_MODEL_ID = "sora-2" as const;
export const SORA_2_PRO_MODEL_ID = "sora-2-pro" as const;
export const VEO_3_1_MODEL_ID = "veo-3.1" as const;
export const VEO_3_1_PRO_MODEL_ID = "veo-3.1-pro" as const;

/**
 * Model-specific configuration
 */
const SORA_2_ENDPOINT = "fal-ai/sora-2/image-to-video";
const SORA_2_NAME = "Sora 2";

const SORA_2_PRO_ENDPOINT = "fal-ai/sora-2/image-to-video/pro";
const SORA_2_PRO_NAME = "Sora 2 Pro";

const VEO_3_1_ENDPOINT = "fal-ai/veo3.1/fast/image-to-video";
const VEO_3_1_NAME = "VEO 3.1 Fast";

const VEO_3_1_PRO_ENDPOINT = "fal-ai/veo3.1/image-to-video";
const VEO_3_1_PRO_NAME = "VEO 3.1";

/**
 * Shared UI copy and configuration
 */
const MODEL_CATEGORY = "image-to-video";

const ASPECT_RATIO_OPTIONS = {
  AUTO: { label: "Auto (from image)", value: "auto" },
  PORTRAIT: { label: "9:16 (Portrait)", value: "9:16" },
  LANDSCAPE: { label: "16:9 (Landscape)", value: "16:9" },
} as const;

const DURATION_OPTIONS = {
  FOUR: { label: "4 seconds", value: "4" },
  EIGHT: { label: "8 seconds", value: "8" },
  TWELVE: { label: "12 seconds", value: "12" },
} as const;

const RESOLUTION_OPTIONS = {
  AUTO: { label: "Auto (from image)", value: "auto" },
  P720: { label: "720p", value: "720p" },
  P1080: { label: "1080p", value: "1080p" },
} as const;

const FIELD_LABELS = {
  ASPECT_RATIO: "Aspect Ratio",
  DURATION: "Duration",
  PROMPT: "Prompt",
  RESOLUTION: "Resolution",
} as const;

const FIELD_DESCRIPTIONS = {
  ASPECT_RATIO: "Select the aspect ratio for the generated video",
  DURATION: "Duration of the generated video in seconds",
  PROMPT: "Describe the motion, action, and camera movement for the video",
  RESOLUTION: "Select the resolution for the generated video",
} as const;

const PROMPT_PLACEHOLDER =
  "Camera slowly zooms in while the subject looks around...";

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
}

/**
 * Registry of enabled video models keyed by identifier.
 */
export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  [SORA_2_MODEL_ID]: {
    category: MODEL_CATEGORY,
    defaults: {
      aspectRatio: "auto",
      duration: "8",
      prompt: "",
      resolution: "auto",
    },
    endpoint: SORA_2_ENDPOINT,
    id: SORA_2_MODEL_ID,
    isDefault: true,
    name: SORA_2_NAME,
    options: {
      aspectRatio: {
        description: FIELD_DESCRIPTIONS.ASPECT_RATIO,
        label: FIELD_LABELS.ASPECT_RATIO,
        name: "aspectRatio",
        options: [
          ASPECT_RATIO_OPTIONS.AUTO,
          ASPECT_RATIO_OPTIONS.PORTRAIT,
          ASPECT_RATIO_OPTIONS.LANDSCAPE,
        ],
        type: "select",
      },
      duration: {
        default: "8",
        description: FIELD_DESCRIPTIONS.DURATION,
        label: FIELD_LABELS.DURATION,
        name: "duration",
        options: [
          DURATION_OPTIONS.FOUR,
          DURATION_OPTIONS.EIGHT,
          DURATION_OPTIONS.TWELVE,
        ],
        type: "select",
      },
      prompt: {
        description: FIELD_DESCRIPTIONS.PROMPT,
        label: FIELD_LABELS.PROMPT,
        name: "prompt",
        placeholder: PROMPT_PLACEHOLDER,
        required: true,
        type: "text",
      },
      resolution: {
        default: "auto",
        description: FIELD_DESCRIPTIONS.RESOLUTION,
        label: FIELD_LABELS.RESOLUTION,
        name: "resolution",
        options: [
          RESOLUTION_OPTIONS.AUTO,
          RESOLUTION_OPTIONS.P720,
          RESOLUTION_OPTIONS.P1080,
        ],
        type: "select",
      },
    },
  },
  [SORA_2_PRO_MODEL_ID]: {
    category: MODEL_CATEGORY,
    defaults: {
      aspectRatio: "auto",
      duration: "8",
      prompt: "",
      resolution: "auto",
    },
    endpoint: SORA_2_PRO_ENDPOINT,
    id: SORA_2_PRO_MODEL_ID,
    isDefault: false,
    name: SORA_2_PRO_NAME,
    options: {
      aspectRatio: {
        description: FIELD_DESCRIPTIONS.ASPECT_RATIO,
        label: FIELD_LABELS.ASPECT_RATIO,
        name: "aspectRatio",
        options: [
          ASPECT_RATIO_OPTIONS.AUTO,
          ASPECT_RATIO_OPTIONS.PORTRAIT,
          ASPECT_RATIO_OPTIONS.LANDSCAPE,
        ],
        type: "select",
      },
      duration: {
        default: "8",
        description: FIELD_DESCRIPTIONS.DURATION,
        label: FIELD_LABELS.DURATION,
        name: "duration",
        options: [
          DURATION_OPTIONS.FOUR,
          DURATION_OPTIONS.EIGHT,
          DURATION_OPTIONS.TWELVE,
        ],
        type: "select",
      },
      prompt: {
        description: FIELD_DESCRIPTIONS.PROMPT,
        label: FIELD_LABELS.PROMPT,
        name: "prompt",
        placeholder: PROMPT_PLACEHOLDER,
        required: true,
        type: "text",
      },
      resolution: {
        default: "auto",
        description: FIELD_DESCRIPTIONS.RESOLUTION,
        label: FIELD_LABELS.RESOLUTION,
        name: "resolution",
        options: [
          RESOLUTION_OPTIONS.AUTO,
          RESOLUTION_OPTIONS.P720,
          RESOLUTION_OPTIONS.P1080,
        ],
        type: "select",
      },
    },
  },
  [VEO_3_1_MODEL_ID]: {
    category: MODEL_CATEGORY,
    defaults: {
      aspectRatio: "16:9",
      duration: "8",
      prompt: "",
      resolution: "1080p",
    },
    endpoint: VEO_3_1_ENDPOINT,
    id: VEO_3_1_MODEL_ID,
    isDefault: false,
    name: VEO_3_1_NAME,
    options: {
      aspectRatio: {
        description: FIELD_DESCRIPTIONS.ASPECT_RATIO,
        label: FIELD_LABELS.ASPECT_RATIO,
        name: "aspectRatio",
        options: [
          ASPECT_RATIO_OPTIONS.PORTRAIT,
          ASPECT_RATIO_OPTIONS.LANDSCAPE,
        ],
        type: "select",
      },
      duration: {
        default: "8",
        description: FIELD_DESCRIPTIONS.DURATION,
        label: FIELD_LABELS.DURATION,
        name: "duration",
        options: [
          DURATION_OPTIONS.FOUR,
          DURATION_OPTIONS.EIGHT,
          DURATION_OPTIONS.TWELVE,
        ],
        type: "select",
      },
      prompt: {
        description: FIELD_DESCRIPTIONS.PROMPT,
        label: FIELD_LABELS.PROMPT,
        name: "prompt",
        placeholder: PROMPT_PLACEHOLDER,
        required: true,
        type: "text",
      },
      resolution: {
        default: "720p",
        description: FIELD_DESCRIPTIONS.RESOLUTION,
        label: FIELD_LABELS.RESOLUTION,
        name: "resolution",
        options: [RESOLUTION_OPTIONS.P720, RESOLUTION_OPTIONS.P1080],
        type: "select",
      },
    },
  },
  [VEO_3_1_PRO_MODEL_ID]: {
    category: MODEL_CATEGORY,
    defaults: {
      aspectRatio: "16:9",
      duration: "8",
      prompt: "",
      resolution: "720p",
    },
    endpoint: VEO_3_1_PRO_ENDPOINT,
    id: VEO_3_1_PRO_MODEL_ID,
    isDefault: false,
    name: VEO_3_1_PRO_NAME,
    options: {
      aspectRatio: {
        description: FIELD_DESCRIPTIONS.ASPECT_RATIO,
        label: FIELD_LABELS.ASPECT_RATIO,
        name: "aspectRatio",
        options: [
          ASPECT_RATIO_OPTIONS.PORTRAIT,
          ASPECT_RATIO_OPTIONS.LANDSCAPE,
        ],
        type: "select",
      },
      duration: {
        default: "8",
        description: FIELD_DESCRIPTIONS.DURATION,
        label: FIELD_LABELS.DURATION,
        name: "duration",
        options: [
          DURATION_OPTIONS.FOUR,
          DURATION_OPTIONS.EIGHT,
          DURATION_OPTIONS.TWELVE,
        ],
        type: "select",
      },
      prompt: {
        description: FIELD_DESCRIPTIONS.PROMPT,
        label: FIELD_LABELS.PROMPT,
        name: "prompt",
        placeholder: PROMPT_PLACEHOLDER,
        required: true,
        type: "text",
      },
      resolution: {
        default: "720p",
        description: FIELD_DESCRIPTIONS.RESOLUTION,
        label: FIELD_LABELS.RESOLUTION,
        name: "resolution",
        options: [RESOLUTION_OPTIONS.P720, RESOLUTION_OPTIONS.P1080],
        type: "select",
      },
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
