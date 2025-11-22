/**
 * Structured Logging Infrastructure
 *
 * Re-exports the unified logger from @/lib/logger for backwards compatibility.
 * All new code should import directly from "@/lib/logger".
 *
 * @module shared/logging/logger
 * @deprecated Use `import { logger, createLogger } from "@/lib/logger"` instead
 */

export { logger, createLogger } from "@/lib/logger";
export type { ServiceLogger } from "@/lib/logger";
