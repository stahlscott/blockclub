// Abstracted logger module
// Easy to swap for Sentry or other error monitoring services later
//
// Usage:
//   import { logger } from "@/lib/logger";
//   logger.error("Something went wrong", error, { userId: "123" });

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
   * In production, this is where Sentry.captureException would go.
   */
  error: (message: string, error?: unknown, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") {
      console.error(`[ERROR] ${message}`, error ? formatError(error) : "", context || "");
    } else {
      // Production: Replace with Sentry or other error monitoring
      // Sentry.captureException(error, { extra: { message, ...context } });
      
      // For now, still log to console in production (will appear in Vercel logs)
      console.error(`[ERROR] ${message}`, error ? formatError(error) : "", context || "");
    }
  },

  /**
   * Log a warning. Useful for non-critical issues.
   */
  warn: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[WARN] ${message}`, context || "");
    } else {
      // Production: Could send to monitoring service
      console.warn(`[WARN] ${message}`, context || "");
    }
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
