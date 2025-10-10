/**
 * Canvas page constants
 * All hardcoded strings and magic numbers used in the canvas application
 */

export const CANVAS_STRINGS = {
  CHAT: {
    AI_ASSISTANT: "AI Assistant",
    BUTTON_LABEL: "Chat",
    POWERED_BY: "Powered by GPT-4",
  },
  ERRORS: {
    COMBINE_FAILED: "Failed to combine images",
    CONVERSION_FAILED: "Conversion failed",
    CONVERSION_START_FAILED: "Failed to start conversion",
    EXTENSION_FAILED: "Extension failed",
    EXTENSION_START_FAILED: "Failed to start video extension",
    GENERATION_FAILED: "Generation failed",
    PROCESSING_ERROR: "Error processing video",
    TRANSFORMATION_FAILED: "Transformation failed",
    TRANSFORMATION_START_FAILED: "Failed to start transformation",
    UNKNOWN_ERROR: "Unknown error",
    VIDEO_CREATION_FAILED: "Error creating video",
    VIDEO_FAILED: "Failed to create video",
    VIDEO_GENERATION_FAILED: "Video generation failed",
  },
  SUCCESS: {
    IMAGE_GENERATED: "Image generated",
    IMAGE_GENERATED_DESCRIPTION:
      "The AI-generated image has been added to the canvas",
    VIDEO_CREATED: "Video created successfully",
    VIDEO_PROCESSED: "Video processed successfully",
  },
  VIDEO: {
    BACKGROUND_REMOVAL_DESCRIPTION: "This may take several minutes...",
    BACKGROUND_REMOVAL_TITLE: "Removing background from video",
    REMOVING_BACKGROUND_PROMPT: "Removing background from video",
  },
} as const;

export const CANVAS_DIMENSIONS = {
  BUFFER: 100,
  DEFAULT_IMAGE_SIZE: 512,
  DEFAULT_MAX_SIZE: 200,
  DEFAULT_SPACING: 250,
  GRADIENT_HEIGHT: 24,
  GRADIENT_WIDTH: 24,
  IMAGE_OFFSET: 256,
  IMAGE_SPACING: 20,
} as const;

export const VIDEO_DEFAULTS = {
  CURRENT_TIME: 0,
  DURATION: 5,
  IS_LOOPING: false,
  IS_PLAYING: false,
  MODEL_ID: "seedance-pro",
  MUTED: false,
  RESOLUTION: "720p",
  ROTATION: 0,
  VOLUME: 1,
} as const;

export const COLOR_MAP: Record<string, string> = {
  black: "Black",
  blue: "Blue",
  cyan: "Cyan",
  gray: "Gray",
  green: "Green",
  magenta: "Magenta",
  orange: "Orange",
  red: "Red",
  transparent: "Transparent",
  white: "White",
  yellow: "Yellow",
} as const;

export const DEFAULT_IMAGES = {
  PATHS: ["/us.jpeg"],
} as const;

export const ANIMATION = {
  CHAT_DURATION: 0.2,
  SAVE_DELAY: 100,
} as const;

export const ARIA_LABELS = {
  CANVAS_MAIN: "Interactive canvas workspace",
  CHAT_BUTTON: "Open AI chat assistant",
  CHAT_CLOSE: "Close chat panel",
  CHAT_PANEL: "AI chat assistant panel",
  CONTEXT_MENU: "Canvas context menu",
  STAGE: "Canvas drawing stage",
} as const;
