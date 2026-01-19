/**
 * Standardized result types for server actions and API routes.
 * All operations should return these shapes for consistency.
 */

/**
 * Base result type for all operations.
 * @template T - The type of data returned on success (void if none)
 */
export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Helper type for results that must return data.
 * Use when the operation always returns data on success.
 */
export type DataResult<T> = ActionResult<T> & { data: T };

/**
 * Common error codes for programmatic handling.
 * Maps to HTTP status codes for API routes.
 */
export type ErrorCode =
  | "UNAUTHORIZED" // 401 - not logged in
  | "FORBIDDEN" // 403 - logged in but not allowed
  | "NOT_FOUND" // 404 - resource doesn't exist
  | "VALIDATION_ERROR" // 400 - bad input
  | "CONFLICT" // 409 - already exists, etc.
  | "SERVER_ERROR"; // 500 - unexpected error

/**
 * Extended result for API routes that need error codes.
 * Use in API routes where HTTP status code mapping is needed.
 */
export interface ApiResult<T = void> extends ActionResult<T> {
  code?: ErrorCode;
}

/**
 * Map error codes to HTTP status codes.
 * Utility for API route handlers.
 */
export const ERROR_CODE_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  SERVER_ERROR: 500,
};
