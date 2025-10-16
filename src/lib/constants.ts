/**
 * Application-wide constants.
 *
 * @remarks
 * Centralized constants to ensure consistency and maintainability.
 * All hardcoded values should be defined here and imported where needed.
 */

/**
 * Storage configuration constants.
 */
export const STORAGE_CONSTANTS = {
  /** IndexedDB database name */
  DB_NAME: "iskra-studio-db",
  /** IndexedDB database version */
  DB_VERSION: 2,
  /** LocalStorage key for canvas state */
  STATE_KEY: "canvas-state",
  /** Maximum image/video size in bytes (50MB) */
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  /** Maximum file size for Convex uploads (25MB) */
  MAX_CONVEX_FILE_SIZE: 25 * 1024 * 1024,
} as const;

/**
 * Sync manager configuration constants.
 */
export const SYNC_CONSTANTS = {
  /** LocalStorage key for sync queue */
  QUEUE_KEY: "sync-queue",
  /** Maximum retry attempts for failed syncs */
  MAX_RETRIES: 3,
  /** Base retry delay in milliseconds */
  RETRY_DELAY_MS: 1000,
  /** Maximum jitter in milliseconds for exponential backoff */
  MAX_JITTER_MS: 1000,
} as const;

/**
 * Auto-save configuration constants.
 */
export const AUTOSAVE_CONSTANTS = {
  /** Default debounce delay in milliseconds */
  DEBOUNCE_MS: 10000,
  /** Minimum debounce delay in milliseconds */
  MIN_DEBOUNCE_MS: 1000,
  /** Maximum debounce delay in milliseconds */
  MAX_DEBOUNCE_MS: 60000,
} as const;



/**
 * File validation constants.
 */
export const FILE_VALIDATION = {
  /** Allowed image MIME type prefixes */
  ALLOWED_IMAGE_TYPES: ["image/"] as const,
  /** Allowed video MIME type prefixes */
  ALLOWED_VIDEO_TYPES: ["video/"] as const,
  /** Maximum dimension for images/videos */
  MAX_DIMENSION: 10000,
  /** Maximum video duration in seconds (2 hours) */
  MAX_VIDEO_DURATION: 7200,
} as const;

/**
 * Project limits constants.
 */
export const PROJECT_LIMITS = {
  /** Maximum number of projects per user */
  MAX_PROJECTS: 100,
  /** Maximum number of canvas elements per project */
  MAX_ELEMENTS: 1000,
  /** Maximum project name length */
  MAX_NAME_LENGTH: 100,
  /** Default project list limit */
  DEFAULT_LIST_LIMIT: 50,
} as const;

/**
 * Network and request constants.
 */
export const NETWORK_CONSTANTS = {
  /** Default request timeout in milliseconds */
  DEFAULT_TIMEOUT_MS: 30000,
  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,
} as const;

/**
 * UI and animation constants.
 */
export const UI_CONSTANTS = {
  /** Debounce delay for storage saves in milliseconds */
  STORAGE_SAVE_DEBOUNCE_MS: 1000,
  /** Delay before hiding saving indicator in milliseconds */
  SAVING_INDICATOR_DELAY_MS: 300,
} as const;

/**
 * Error messages.
 */
export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "Authentication required",
  FILE_TOO_LARGE: "File too large. Maximum size is 25MB.",
  INVALID_FILE_TYPE: "Unsupported file type. Only images and videos are allowed.",
  INVALID_FILE_SIZE: "Invalid file size",
  INVALID_MIME_TYPE: "Invalid MIME type",
  INVALID_DIMENSIONS: "Invalid dimensions",
  INVALID_DURATION: "Invalid duration",
  MAX_PROJECTS_REACHED: "Maximum number of projects reached (100)",
  MAX_ELEMENTS_REACHED: "Too many canvas elements (max 1000)",
  NAME_TOO_LONG: "Project name too long (max 100 characters)",
  NAME_EMPTY: "Project name cannot be empty",
  NOT_AUTHENTICATED: "Not authenticated",
  PROJECT_NOT_FOUND: "Project not found",
  
  SYNC_FAILED: "Failed to sync to cloud",
  UNAUTHORIZED: "Unauthorized",
  UPLOAD_FAILED: "Upload failed",
  USER_NOT_FOUND: "User not found",
} as const;

/**
 * Success messages.
 */
export const SUCCESS_MESSAGES = {
  PROJECT_CREATED: "Project created successfully",
  PROJECT_DELETED: "Project deleted successfully",
  PROJECT_RENAMED: "Project renamed successfully",
  PROJECT_SAVED: "Project saved successfully",
  UPLOAD_SUCCESS: "Upload successful",
} as const;

/**
 * IndexedDB object store names.
 */
export const OBJECT_STORES = {
  IMAGES: "images",
  VIDEOS: "videos",
} as const;

/**
 * Event names for network status.
 */
export const NETWORK_EVENTS = {
  ONLINE: "online",
  OFFLINE: "offline",
} as const;

/**
 * Placeholder data URLs.
 */
export const PLACEHOLDER_URLS = {
  /** Transparent 1x1 GIF */
  TRANSPARENT_GIF: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP",
} as const;
