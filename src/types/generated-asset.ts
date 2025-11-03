export interface GeneratedAssetMetadata {
  /** Camera angle directive for AI-generated camera angle variations */
  cameraAngle?: string;
  /** Director name for AI-generated director-style variations */
  directorName?: string;
  /** Video duration in seconds */
  duration?: number;
  /** Image/video height in pixels */
  height?: number;
  /** AI model used for generation */
  model?: string;
  /** Text prompt used for generation */
  prompt?: string;
  /** Random seed used for generation */
  seed?: number;
  /** Image/video width in pixels */
  width?: number;
}

export interface GeneratedAssetUploadPayload {
  assetType: "image" | "video";
  metadata?: GeneratedAssetMetadata;
  sourceUrl: string;
}
