// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server configuration
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,

      // Enable Sentry Logs
      enableLogs: true,

      // Automatically capture console.error as Sentry logs
      integrations: [Sentry.consoleLoggingIntegration({ levels: ["error"] })],

      // Only enable Sentry when DSN is configured
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Filter out noisy errors
      ignoreErrors: [
        // Network/fetch errors that happen during user navigation
        "AbortError",
        "Failed to fetch",
        "Network request failed",
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge configuration
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Adjust this value in production, or use tracesSampler for greater control
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Setting this option to true will print useful information to the console while you're setting up Sentry.
      debug: false,

      // Enable Sentry Logs
      enableLogs: true,

      // Automatically capture console.error as Sentry logs
      integrations: [Sentry.consoleLoggingIntegration({ levels: ["error"] })],

      // Only enable Sentry when DSN is configured
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  }
}
