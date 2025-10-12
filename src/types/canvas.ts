export interface PlacedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity?: number;
  isGenerated?: boolean;
  isLoading?: boolean;
  parentGroupId?: string;
}

export interface PlacedVideo extends Omit<PlacedImage, "isGenerated"> {
  isVideo: true;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  isLooping?: boolean; // Whether the video should loop when it reaches the end
  isGenerating?: boolean; // Similar to isGenerated for images
  isLoaded?: boolean; // Whether the video has loaded its metadata
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
  prompt: string;
  duration?: number;
  styleId?: string;
  motion?: string; // For image-to-video
  sourceUrl?: string; // For image-to-video or video-to-video
  modelId?: string; // Model identifier from video-models.ts
  resolution?: "480p" | "720p" | "1080p"; // Video resolution
  cameraFixed?: boolean; // Whether to fix the camera position
  seed?: number; // Random seed to control video generation
  isVideoToVideo?: boolean; // Indicates if this is a video-to-video transformation
  isVideoExtension?: boolean; // Indicates if this is a video extension (using last frame)
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
  videoUrl?: string;
  imageUrl?: string; // For image-to-video
  prompt: string;
  duration?: number;
  motion?: string;
  styleId?: string;
  modelId?: string; // Model identifier from video-models.ts
  modelConfig?: any; // Model configuration from video-models.ts
  resolution?: "480p" | "720p" | "1080p"; // Video resolution
  cameraFixed?: boolean; // Whether to fix the camera position
  seed?: number; // Random seed to control video generation
  sourceImageId?: string; // ID of the image used for img2vid
  sourceVideoId?: string; // ID of the video used for vid2vid
  isVideoToVideo?: boolean; // Indicates if this is a video-to-video transformation
  isVideoExtension?: boolean; // Indicates if this is a video extension
  toastId?: string; // ID of the toast notification
  [key: string]: unknown; // Allow additional model-specific fields
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  visible: boolean;
}
