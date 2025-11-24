export interface GeneratedAssetMetadata {
  /** Camera angle directive for AI-generated camera angle variations */
  cameraAngle?: string;
  /** Character description for AI-generated character variations */
  characterVariation?: string;
  /** Director name for AI-generated director-style variations */
  directorName?: string;
  /** Video duration in seconds */
  duration?: number;
  /** Emotion label for AI-generated emotion variations (e.g., "Joy", "Sadness") */
  emotion?: string;
  /** Image/video height in pixels */
  height?: number;
  /** Lighting scenario for AI-generated lighting variations */
  lightingScenario?: string;
  /** AI model used for generation */
  model?: string;
  /** Text prompt used for generation */
  prompt?: string;
  /** Random seed used for generation */
  seed?: number;
  /** Time progression label for storyline variations (e.g., "+1min", "+2h5m") */
  storylineLabel?: string;
  /** Surface map type for AI-generated surface variations */
  surfaceMap?: string;
  /** Variation type for grouping/filtering (e.g., "director", "camera", "emotion", "storyline", "character") */
  variationType?: string;
  /** Image/video width in pixels */
  width?: number;
}

export interface GeneratedAssetUploadPayload {
  assetType: "image" | "video";
  metadata?: GeneratedAssetMetadata;
  sourceUrl: string;
}
