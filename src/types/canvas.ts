export interface PlacedImage {
  assetId?: string;
  assetSyncedAt?: number;
  displayAsThumbnail?: boolean;
  fullSizeSrc?: string;
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

export interface ActiveGeneration {
  imageSize?: "landscape_16_9" | "portrait_16_9" | "landscape_4_3" | "portrait_4_3" | "square" | { width: number; height: number };
  imageUrl: string;
  isVariation?: boolean;
  prompt: string;
}

export interface ActiveVideoGeneration {
  aspectRatio?: "auto" | "9:16" | "16:9" | "1:1";
  cameraFixed?: boolean;
  duration?: number | string;
  imageUrl?: string;
  [key: string]: unknown;
  modelConfig?: any;
  modelId?: string;
  motion?: string;
  prompt: string;
  resolution?: "auto" | "480p" | "720p" | "1080p";
  seed?: number;
  sourceImageId?: string;
  styleId?: string;
  toastId?: string;
  videoUrl?: string;
}

export interface SelectionBox {
  endX: number;
  endY: number;
  startX: number;
  startY: number;
  visible: boolean;
}
