/**
 * Beautiful & Maintainable Logger
 *
 * Provides consistent, emoji-prefixed logging with the format:
 * "{EMOJI} {SERVICE_IN_UPPERCASE}: MESSAGE"
 *
 * @example
 * const log = createLogger("AUTH");
 * log.info("User logged in");
 * // Output: ℹ️ AUTH: User logged in
 *
 * log.error("Failed to authenticate", { userId: "123" });
 * // Output: ❌ AUTH: Failed to authenticate { userId: "123" }
 */

type LogLevel = "debug" | "info" | "success" | "warn" | "error";

const LOG_EMOJIS: Record<LogLevel, string> = {
  debug: "🔍",
  info: "ℹ️",
  success: "✅",
  warn: "⚠️",
  error: "❌",
};

/**
 * Formats data for logging output
 */
function formatData(data: unknown): string {
  if (data === undefined || data === null) return "";
  if (data instanceof Error) {
    return data.stack || data.message;
  }
  if (typeof data === "object") {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  return String(data);
}

/**
 * Core logging function with format: "{EMOJI} {SERVICE}: MESSAGE"
 */
function log(
  level: LogLevel,
  service: string,
  message: string,
  data?: unknown,
): void {
  const emoji = LOG_EMOJIS[level];
  const serviceUpper = service.toUpperCase();
  const dataStr = data !== undefined ? ` ${formatData(data)}` : "";
  const formatted = `${emoji} ${serviceUpper}: ${message}${dataStr}`;

  const consoleMethod =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "debug"
          ? console.debug
          : console.log;

  consoleMethod(formatted);
}

/**
 * Service-specific logger interface
 */
interface ServiceLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  success: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

/**
 * Creates a service-specific logger
 *
 * @param service - Service name (will be uppercased in output)
 * @returns Logger instance for the service
 *
 * @example
 * const log = createLogger("POLAR");
 * log.info("Checkout created");
 * // Output: ℹ️ POLAR: Checkout created
 *
 * log.error("Payment failed", { orderId: "123" });
 * // Output: ❌ POLAR: Payment failed { orderId: "123" }
 */
export function createLogger(service: string): ServiceLogger {
  return {
    debug: (message: string, data?: unknown) => {
      if (process.env.NODE_ENV === "development") {
        log("debug", service, message, data);
      }
    },
    info: (message: string, data?: unknown) => log("info", service, message, data),
    success: (message: string, data?: unknown) => log("success", service, message, data),
    warn: (message: string, data?: unknown) => log("warn", service, message, data),
    error: (message: string, data?: unknown) => log("error", service, message, data),
  };
}

/**
 * Pre-configured loggers for common services
 */
export const logger = {
  api: createLogger("API"),
  auth: createLogger("AUTH"),
  battery: createLogger("BATTERY"),
  bria: createLogger("BRIA"),
  config: createLogger("CONFIG"),
  fal: createLogger("FAL"),
  generation: createLogger("GENERATION"),
  image: createLogger("IMAGE"),
  polar: createLogger("POLAR"),
  quota: createLogger("QUOTA"),
  storage: createLogger("STORAGE"),
  subscription: createLogger("SUBSCRIPTION"),
  sync: createLogger("SYNC"),
  ui: createLogger("UI"),
  upload: createLogger("UPLOAD"),
  video: createLogger("VIDEO"),
  webhook: createLogger("WEBHOOK"),

  /**
   * Creates a child logger with a custom service name
   * Supports legacy 3-argument error signature for backward compatibility
   * @deprecated Use createLogger() directly instead
   */
  child: (context: { service?: string;[key: string]: unknown }) => {
    const service = context.service || "APP";
    return {
      debug: (message: string, data?: unknown) => {
        if (process.env.NODE_ENV === "development") {
          log("debug", service, message, data);
        }
      },
      info: (message: string, data?: unknown) => log("info", service, message, data),
      success: (message: string, data?: unknown) => log("success", service, message, data),
      warn: (message: string, data?: unknown) => log("warn", service, message, data),
      error: (message: string, error?: Error | unknown, ctx?: unknown) => {
        const data = error instanceof Error
          ? { error: error.message, stack: error.stack, ...((ctx as object) || {}) }
          : error !== undefined
            ? { error, ...((ctx as object) || {}) }
            : ctx;
        log("error", service, message, data);
      },
    };
  },

  /**
   * Direct logging methods for backward compatibility
   */
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      log("debug", "APP", message, data);
    }
  },
  info: (message: string, data?: unknown) => log("info", "APP", message, data),
  success: (message: string, data?: unknown) => log("success", "APP", message, data),
  warn: (message: string, data?: unknown) => log("warn", "APP", message, data),
  error: (message: string, error?: Error | unknown, context?: unknown) => {
    const data = error instanceof Error
      ? { error: error.message, stack: error.stack, ...((context as object) || {}) }
      : error !== undefined
        ? { error, ...((context as object) || {}) }
        : context;
    log("error", "APP", message, data);
  },
};

export type { ServiceLogger };
