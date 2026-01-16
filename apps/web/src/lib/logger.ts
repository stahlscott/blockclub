// Abstracted logger module
// Integrates with Sentry for production error monitoring
//
// Usage:
//   import { logger } from "@/lib/logger";
//   logger.error("Something went wrong", error, { userId: "123" });

import { captureException } from "@/lib/sentry";

type LogContext = Record<string, unknown>;

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }
  return String(error);
}

export const logger = {
  /**
   * Log an error. In development, logs to console.
   * In production, sends to Sentry and logs to console (for Vercel logs).
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    // Always log to console (shows in Vercel logs in production)
    console.error(`[ERROR] ${message}`, error ? formatError(error) : "", context || "");

    // In production, also send to Sentry
    if (process.env.NODE_ENV === "production" && error) {
      captureException(error, { operation: message, ...context });
    }
  },

  /**
   * Log a warning. Useful for non-critical issues.
   */
  warn: (message: string, context?: LogContext) => {
    console.warn(`[WARN] ${message}`, context || "");
  },

  /**
   * Log informational messages. Only logs in development.
   */
  info: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[INFO] ${message}`, context || "");
    }
    // In production, info logs are typically suppressed
  },

  /**
   * Log debug messages. Only logs in development.
   */
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, context || "");
    }
  },
};
