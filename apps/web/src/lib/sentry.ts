// Sentry utility module for user/neighborhood context and error capturing
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

interface SentryUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

interface SentryNeighborhood {
  id: string;
  name: string;
  slug: string;
}

/**
 * Set the current user context for Sentry.
 * Called from AuthProvider when auth state changes.
 */
export function setSentryUser(user: SentryUser | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email ?? undefined,
      username: user.name ?? undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Set the current neighborhood context for Sentry.
 * Called from NeighborhoodProvider when neighborhood changes.
 */
export function setSentryNeighborhood(neighborhood: SentryNeighborhood | null): void {
  if (neighborhood) {
    Sentry.setTag("neighborhood_id", neighborhood.id);
    Sentry.setTag("neighborhood_slug", neighborhood.slug);
    Sentry.setContext("neighborhood", {
      id: neighborhood.id,
      name: neighborhood.name,
      slug: neighborhood.slug,
    });
  } else {
    Sentry.setTag("neighborhood_id", undefined);
    Sentry.setTag("neighborhood_slug", undefined);
    Sentry.setContext("neighborhood", null);
  }
}

/**
 * Capture an exception with additional context.
 * Use this instead of Sentry.captureException directly for consistent context.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture an error with a specific error boundary tag.
 * Use this in error.tsx files to identify which boundary caught the error.
 */
export function captureErrorBoundary(
  error: Error & { digest?: string },
  boundaryName: "global" | "root" | "protected" | "neighborhood"
): string {
  return Sentry.captureException(error, {
    tags: {
      errorBoundary: boundaryName,
    },
    extra: {
      digest: error.digest,
    },
  });
}

/**
 * Add a breadcrumb to track user journey.
 * Useful for understanding what actions led to an error.
 */
export function addBreadcrumb(
  message: string,
  category: "navigation" | "action" | "query" | "auth",
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level: "info",
    data,
  });
}

/**
 * Set a custom tag on the current scope.
 */
export function setTag(key: string, value: string | undefined): void {
  Sentry.setTag(key, value);
}

/**
 * Wrap a function to capture any errors that occur.
 * Useful for async operations that might fail silently.
 */
export async function withSentryCapture<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureException(error, { operation });
    throw error;
  }
}
