/**
 * Professional Logging Utility
 *
 * Provides consistent, emoji-prefixed logging across the application.
 * Supports different log levels with appropriate visual indicators.
 */

type LogLevel = "debug" | "info" | "success" | "warn" | "error";

interface LogOptions {
  /** Optional context/namespace for the log message */
  context?: string;
  /** Optional data to log alongside the message */
  data?: unknown;
}

const LOG_EMOJIS = {
  debug: "🔍",
  info: "ℹ️",
  success: "✅",
  warn: "⚠️",
  error: "❌",
} as const;

const LOG_COLORS = {
  debug: "#6B7280", // gray-500
  info: "#3B82F6", // blue-500
  success: "#10B981", // green-500
  warn: "#F59E0B", // amber-500
  error: "#EF4444", // red-500
} as const;

/**
 * Formats a log message with emoji, context, and styling
 */
function formatLog(
  level: LogLevel,
  message: string,
  options?: LogOptions,
): string[] {
  const emoji = LOG_EMOJIS[level];
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const contextStr = options?.context ? `[${options.context}]` : "";
  const levelStr = level.toUpperCase().padEnd(7);

  return [
    `%c${emoji} ${timestamp} ${levelStr}${contextStr}%c ${message}`,
    `color: ${LOG_COLORS[level]}; font-weight: bold;`,
    "color: inherit; font-weight: normal;",
  ];
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, options?: LogOptions): void {
  const [formatted, ...styles] = formatLog(level, message, options);

  const consoleMethod =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log;

  if (options?.data !== undefined) {
    consoleMethod(formatted, ...styles, options.data);
  } else {
    consoleMethod(formatted, ...styles);
  }
}

/**
 * Logger object with convenience methods
 */
export const logger = {
  /**
   * Debug log - for detailed diagnostic information
   * @example logger.debug("Processing image batch", { context: "ImageHandler", data: batch })
   */
  debug: (message: string, options?: LogOptions) => {
    if (process.env.NODE_ENV === "development") {
      log("debug", message, options);
    }
  },

  /**
   * Info log - for general informational messages
   * @example logger.info("Starting video generation", { context: "VideoHandler" })
   */
  info: (message: string, options?: LogOptions) => {
    log("info", message, options);
  },

  /**
   * Success log - for successful operations
   * @example logger.success("Project saved successfully", { context: "ProjectSync" })
   */
  success: (message: string, options?: LogOptions) => {
    log("success", message, options);
  },

  /**
   * Warning log - for warning messages
   * @example logger.warn("Rate limit approaching", { context: "API", data: { remaining: 5 } })
   */
  warn: (message: string, options?: LogOptions) => {
    log("warn", message, options);
  },

  /**
   * Error log - for error messages
   * @example logger.error("Failed to upload image", { context: "Storage", data: error })
   */
  error: (message: string, options?: LogOptions) => {
    log("error", message, options);
  },
};

/**
 * Creates a scoped logger with a predefined context
 * @example const log = createLogger("VideoHandler")
 *          log.info("Processing started")
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) =>
      logger.debug(message, { context, data }),
    info: (message: string, data?: unknown) =>
      logger.info(message, { context, data }),
    success: (message: string, data?: unknown) =>
      logger.success(message, { context, data }),
    warn: (message: string, data?: unknown) =>
      logger.warn(message, { context, data }),
    error: (message: string, data?: unknown) =>
      logger.error(message, { context, data }),
  };
}
