/**
 * Structured Logging Infrastructure
 * Provides consistent logging across the application with severity levels and context
 *
 * @module shared/logging/logger
 */

import { config } from "../config/runtime";

/**
 * Log severity levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Log context object for structured metadata
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Log entry structure
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error;
}

/**
 * Formats a log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.message,
  ];

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context, null, 2));
  }

  if (entry.error) {
    parts.push(`\nError: ${entry.error.message}`);
    if (entry.error.stack && config.isDevelopment) {
      parts.push(entry.error.stack);
    }
  }

  return parts.join(" ");
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error,
): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    error,
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case LogLevel.DEBUG:
      if (config.isDevelopment) {
        console.debug(formatted);
      }
      break;
    case LogLevel.INFO:
      console.info(formatted);
      break;
    case LogLevel.WARN:
      console.warn(formatted);
      break;
    case LogLevel.ERROR:
      console.error(formatted);
      break;
  }
}

/**
 * Logger instance with convenience methods
 */
export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: LogContext): void {
    log(LogLevel.DEBUG, message, context);
  },

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    log(LogLevel.INFO, message, context);
  },

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    log(LogLevel.WARN, message, context);
  },

  /**
   * Log errors
   */
  error(message: string, error?: Error, context?: LogContext): void {
    log(LogLevel.ERROR, message, context, error);
  },

  /**
   * Create a child logger with persistent context
   */
  child(persistentContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        log(LogLevel.DEBUG, message, { ...persistentContext, ...context }),
      info: (message: string, context?: LogContext) =>
        log(LogLevel.INFO, message, { ...persistentContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        log(LogLevel.WARN, message, { ...persistentContext, ...context }),
      error: (message: string, error?: Error, context?: LogContext) =>
        log(LogLevel.ERROR, message, { ...persistentContext, ...context }, error),
    };
  },
};
