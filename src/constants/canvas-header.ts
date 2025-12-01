/**
 * Constants for the canvas header component.
 */

/**
 * CSS class names used in the canvas header.
 */
export const CANVAS_HEADER_CLASSES = {
  /** Class for the AI provider selector positioning */
  AI_PROVIDER_SELECTOR: "ml-24",
  /** Class for the image model selector positioning */
  IMAGE_MODEL_SELECTOR: "mr-auto",
  /** Class for the FIBO toggle container */
  FIBO_TOGGLE_CONTAINER: "flex items-center gap-2 mr-4",
  /** Class for the FIBO toggle label */
  FIBO_TOGGLE_LABEL:
    "text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  /** Class for the header container */
  HEADER:
    "fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95",
  /** Class for the header content wrapper */
  HEADER_CONTENT: "flex items-center justify-between h-14 px-4",
  /** Class for the main controls container */
  MAIN_CONTROLS: "flex items-center w-full gap-3",
} as const;

/**
 * Labels and text strings used in the canvas header.
 */
export const CANVAS_HEADER_LABELS = {
  /** Label for the FAL provider option */
  AI_PROVIDER_FAL: "Fal",
  /** Label for the Replicate provider option */
  AI_PROVIDER_REPLICATE: "Replicate",
  /** Label for the FIBO analysis toggle */
  FIBO_ANALYSIS: "FIBO Analysis",
  /** Label for the Nano Banana model option */
  IMAGE_MODEL_NANO_BANANA: "🍌 Nano Banana",
  /** Label for the Seedream model option */
  IMAGE_MODEL_SEEDREAM: "🌱 Seedream",
} as const;

/**
 * ID for the FIBO analysis toggle input.
 */
export const FIBO_TOGGLE_ID = "fibo-mode";
