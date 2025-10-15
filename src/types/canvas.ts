export interface PlacedImage {
  height: number;
  id: string;
  isGenerated?: boolean;
  isLoading?: boolean;
  naturalHeight?: number;
  naturalWidth?: number;
  opacity?: number;
  parentGroupId?: string;
  rotation: number;
  src: string;
  width: number;
  x: number;
  y: number;
}

export interface PlacedVideo extends Omit<PlacedImage, "isGenerated"> {
  currentTime: number;
  duration: number;
  isGenerating?: boolean; // Similar to isGenerated for images
  isLoaded?: boolean; // Whether the video has loaded its metadata
  isLooping?: boolean; // Whether the video should loop when it reaches the end
  isPlaying: boolean;
  isVideo: true;
  muted: boolean;
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
  aspectRatio?: "auto" | "9:16" | "16:9" | "1:1"; // Aspect ratio
  cameraFixed?: boolean; // Whether to fix the camera position
  duration?: number | string; // Can be number or string for different models
  modelId?: string; // Model identifier from video-models.ts
  motion?: string; // For image-to-video
  prompt: string;
  resolution?: "auto" | "480p" | "720p" | "1080p"; // Video resolution
  seed?: number; // Random seed to control video generation
  sourceUrl?: string; // For image-to-video or video-to-video
  styleId?: string;
  [key: string]: unknown; // Allow additional model-specific fields
}

export interface ActiveGeneration {
  imageUrl: string;
  prompt: string;
  isVariation?: boolean;
  imageSize?:
    | "landscape_16_9"
    | "portrait_16_9"
    | "landscape_4_3"
    | "portrait_4_3"
    | "square"
    | {
        width: number;
        height: number;
      };
}

export interface ActiveVideoGeneration {
  aspectRatio?: "auto" | "9:16" | "16:9" | "1:1"; // Aspect ratio
  cameraFixed?: boolean; // Whether to fix the camera position
  duration?: number | string; // Can be number or string for different models
  imageUrl?: string; // For image-to-video
  modelConfig?: any; // Model configuration from video-models.ts
  modelId?: string; // Model identifier from video-models.ts
  motion?: string;
  prompt: string;
  resolution?: "auto" | "480p" | "720p" | "1080p"; // Video resolution
  seed?: number; // Random seed to control video generation
  sourceImageId?: string; // ID of the image used for img2vid
  styleId?: string;
  toastId?: string; // ID of the toast notification
  videoUrl?: string;
  [key: string]: unknown; // Allow additional model-specific fields
}

export interface SelectionBox {
  endX: number;
  endY: number;
  startX: number;
  startY: number;
  visible: boolean;
}
