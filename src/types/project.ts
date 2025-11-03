/**
 * Project type definitions for canvas workspaces.
 *
 * Defines types for managing user projects (canvas workspaces) with
 * saved state, thumbnails, and metadata for the UI.
 */

/**
 * Canvas element transform properties.
 */
export interface ElementTransform {
  /** Rotation angle in degrees */
  rotation: number;
  /** Scale factor (1.0 = 100%) */
  scale: number;
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
}

/**
 * Canvas element (image, video, text, or shape).
 */
export interface CanvasElement {
  /** Reference to asset ID in Convex assets table (replaces imageId/videoId) */
  assetId?: string;

  /** Timestamp when asset was last validated/synced (ms since epoch) */
  assetSyncedAt?: number;

  /** Asset type for quick lookup without fetching (cached from asset record) */
  assetType?: "image" | "video";

  /** Current playback time for videos (seconds) */
  currentTime?: number;

  /** Duration for videos (seconds) - may differ from asset duration if resized by user */
  duration?: number;

  /** Element height in pixels - may differ from asset height if resized by user */
  height?: number;

  /** Unique element identifier */
  id: string;

  /** Video playback state */
  isPlaying?: boolean;

  /** Video mute state */
  muted?: boolean;

  /** Element transform (position, rotation, scale) */
  transform: ElementTransform;

  /** Element type */
  type: "image" | "video" | "text" | "shape";

  /** Video volume (0.0 to 1.0) */
  volume?: number;

  /** Element width in pixels - may differ from asset width if resized by user */
  width?: number;

  /** Z-index for layering */
  zIndex: number;
}

/**
 * Canvas viewport state.
 */
export interface CanvasViewport {
  /** Zoom scale (1.0 = 100%) */
  scale: number;
  /** X position offset */
  x: number;
  /** Y position offset */
  y: number;
}

/**
 * Canvas state stored in projects.
 *
 * Complete snapshot of the canvas workspace including all elements,
 * viewport position, and metadata.
 */
export interface CanvasState {
  /** Canvas background color */
  backgroundColor?: string;
  /** All canvas elements (images, videos, text, shapes) */
  elements: CanvasElement[];
  /** Last modification timestamp (ms since epoch) */
  lastModified: number;
  /** Viewport position and zoom */
  viewport?: CanvasViewport;
}

/**
 * Project record from Convex database.
 *
 * Represents a saved canvas workspace with all its state and metadata.
 * Includes asset thumbnail URLs to optimize bandwidth on project load.
 *
 * @remarks
 * - canvasState contains the complete canvas snapshot
 * - thumbnailStorageId references a 300x200px preview image
 * - assetThumbnails maps assetId to thumbnail URLs (bandwidth optimization)
 * - userId links to the project owner for access control
 */
export interface Project {
  /** Convex document ID */
  _id: string;
  /** Map of asset IDs to thumbnail URLs (for bandwidth optimization) */
  assetThumbnails?: Record<string, string>;
  /** Complete canvas state */
  canvasState: CanvasState;
  /** Timestamp when the project was created (ms since epoch) */
  createdAt: number;
  /** Unique identifier for the project (same as _id) */
  id: string;
  /** Timestamp of last auto-save (ms since epoch) */
  lastSavedAt: number;
  /** Project display name */
  name: string;
  /** Convex storage ID for thumbnail image */
  thumbnailStorageId?: string;
  /** Timestamp when the project was last updated (ms since epoch) */
  updatedAt: number;
  /** User ID of the project owner */
  userId: string;
}

/**
 * Lightweight project metadata for list views.
 *
 * Contains only the essential information needed to display
 * a project card in the project list UI. Includes asset thumbnails
 * for efficient preview rendering without loading full-size images.
 *
 * @remarks
 * Used to avoid loading full canvas state when listing projects.
 * assetThumbnails maps asset IDs to small thumbnail URLs for preview cards.
 */
export interface ProjectMetadata {
  /** Map of asset IDs to thumbnail URLs (for bandwidth optimization) */
  assetThumbnails?: Record<string, string>;
  /** Timestamp when created (ms since epoch) */
  createdAt: number;
  /** Unique project identifier */
  id: string;
  /** Count of image elements in the project */
  imageCount: number;
  /** Timestamp of last save (ms since epoch) */
  lastSavedAt: number;
  /** Project name */
  name: string;
  /** Public URL for thumbnail image */
  thumbnailUrl?: string;
  /** Count of video elements in the project */
  videoCount: number;
}

/**
 * Result returned from project creation.
 */
export interface CreateProjectResult {
  /** The newly created project */
  project: Project;
}

/**
 * Result returned from project save operations.
 */
export interface SaveProjectResult {
  /** Timestamp of the save (ms since epoch) */
  lastSavedAt: number;
  /** ID of the saved project */
  projectId: string;
}
