export interface GeneratedAssetMetadata {
  duration?: number;
  height?: number;
  model?: string;
  prompt?: string;
  seed?: number;
  width?: number;
}

export interface GeneratedAssetUploadPayload {
  assetType: "image" | "video";
  metadata?: GeneratedAssetMetadata;
  sourceUrl: string;
}
