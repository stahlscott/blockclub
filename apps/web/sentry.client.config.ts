// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Session Replay configuration
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extension errors
    /chrome-extension/,
    /moz-extension/,
    // Network errors
    "Failed to fetch",
    "Network request failed",
    "NetworkError",
    // User navigation aborts
    "AbortError",
    // Resize observer errors (benign)
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
  ],

  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
  ],

  // Only enable Sentry when DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
