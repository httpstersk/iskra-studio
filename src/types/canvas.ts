export interface PlacedImage {
  assetId?: string;
  assetSyncedAt?: number;
  cameraAngle?: string;
  directorName?: string;
  displayAsThumbnail?: boolean;
  fullSizeSrc?: string;
  hasContentError?: boolean;
  height: number;
  id: string;
  isDirector?: boolean;
  isGenerated?: boolean;
  isLoading?: boolean;
  naturalHeight?: number;
  naturalWidth?: number;
  opacity?: number;
  parentGroupId?: string;
  pixelatedSrc?: string;
  rotation: number;
  src: string;
  thumbnailSrc?: string;
  width: number;
  x: number;
  y: number;
}

export interface PlacedVideo extends Omit<PlacedImage, "isGenerated"> {
  currentTime: number;
  duration: number;
  isGenerating?: boolean;
  isLoaded?: boolean;
  isLooping?: boolean;
  isPlaying: boolean;
  isVideo: true;
  muted: boolean;
  sourceImageId?: string;
  volume: number;
}

export interface HistoryState {
  images: PlacedImage[];
  videos?: PlacedVideo[]; // Optional for backward compatibility
  selectedIds: string[];
}

export interface GenerationSettings {
  prompt: string;
  styleId?: string;
  variationPrompt?: string;
}

export interface VideoGenerationSettings {
  aspectRatio?: "auto" | "9:16" | "16:9" | "1:1";
  cameraFixed?: boolean;
  duration?: number | string;
  [key: string]: unknown;
  modelId?: string;
  motion?: string;
  prompt: string;
  resolution?: "auto" | "480p" | "720p" | "1080p";
  seed?: number;
  sourceUrl?: string;
  styleId?: string;
}

/**
 * Status stages for image and video generation processes.
 *
 * Tracks the progression from upload through analysis to final generation:
 * - `analyzing`: AI analyzing source image for style/mood
 * - `creating-storyline`: Generating narrative concepts for variations
 * - `finalizing`: Post-processing and optimization
 * - `generating`: Creating the final output
 * - `uploading`: Uploading source image to storage
 */
export type GenerationStatus =
  | "analyzing"
  | "creating-storyline"
  | "finalizing"
  | "generating"
  | "uploading";

/**
 * Configuration for an active image generation job.
 *
 * Tracks all parameters needed for the generation process and its current status.
 * Used by the streaming image generation system to manage multiple concurrent jobs.
 */
export interface ActiveGeneration {
  /** Target dimensions for the generated image */
  imageSize?:
    | "landscape_16_9"
    | "portrait_16_9"
    | "landscape_4_3"
    | "portrait_4_3"
    | "square"
    | { width: number; height: number };
  /** Source image URL for image-to-image generation */
  imageUrl: string;
  /** Whether this is a variation of an existing image */
  isVariation?: boolean;
  /** AI model to use for generation (Seedream or Nano Banana) */
  model?: "seedream" | "nano-banana";
  /** Generation prompt describing the desired output */
  prompt: string;
  /** Current status of the generation process */
  status?: GenerationStatus;
  /** Use FIBO generation with structured prompts (prompt will be FIBO JSON) */
  useFibo?: boolean;
  /** Aspect ratio for FIBO generation */
  fiboAspectRatio?:
    | "1:1"
    | "2:3"
    | "3:2"
    | "3:4"
    | "4:3"
    | "4:5"
    | "5:4"
    | "9:16"
    | "16:9";
}

/**
 * Configuration for an active video generation job.
 *
 * Tracks all parameters needed for video generation and its current status.
 * Used by the streaming video generation system to manage multiple concurrent jobs.
 */
export interface ActiveVideoGeneration {
  /** Target aspect ratio for the generated video */
  aspectRatio?: "auto" | "9:16" | "16:9" | "1:1";
  /** Whether camera movement should be fixed or dynamic */
  cameraFixed?: boolean;
  /** Video duration in seconds */
  duration?: number | string;
  /** Source image URL for image-to-video generation */
  imageUrl?: string;
  /** Model-specific configuration parameters */
  modelConfig?: any;
  /** AI model identifier to use for generation */
  modelId?: string;
  /** Motion settings for the video generation */
  motion?: string;
  /** Generation prompt describing the desired video output */
  prompt: string;
  /** Target resolution for the generated video */
  resolution?: "auto" | "480p" | "720p" | "1080p";
  /** Random seed for reproducible generation */
  seed?: number;
  /** ID of the source image used for generation */
  sourceImageId?: string;
  /** Current status of the generation process */
  status?: GenerationStatus;
  /** Style preset identifier */
  styleId?: string;
  /** Toast notification ID for progress updates */
  toastId?: string;
  /** Generated video URL once complete */
  videoUrl?: string;
  /** Additional model-specific parameters */
  [key: string]: unknown;
}

export interface SelectionBox {
  endX: number;
  endY: number;
  startX: number;
  startY: number;
  visible: boolean;
}
