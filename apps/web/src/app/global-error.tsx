"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// This is a special error boundary that catches errors in the root layout.
// It must define its own <html> and <body> tags since the root layout may have errored.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        errorBoundary: "global",
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>!</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              We encountered a critical error. Please try refreshing the page.
            </p>
            <div style={styles.actions}>
              <button onClick={reset} style={styles.primaryButton}>
                Try Again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Global error can't use Link since the app may have crashed */}
            <a href="/" style={styles.secondaryButton}>
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

// Inline styles since global CSS won't be available if the root layout errored
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "'Nunito', system-ui, -apple-system, sans-serif",
    backgroundColor: "#fafaf9",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "3rem",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    textAlign: "center",
    maxWidth: "400px",
  },
  icon: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    fontSize: "2rem",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "600",
    margin: "0 0 0.75rem 0",
    color: "#18181b",
  },
  message: {
    color: "#52525b",
    marginBottom: "2rem",
    margin: "0 0 2rem 0",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#7c3aed",
    color: "#ffffff",
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    border: "none",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "1rem",
    textDecoration: "none",
  },
  secondaryButton: {
    backgroundColor: "#fafaf9",
    color: "#18181b",
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "500",
  },
};
