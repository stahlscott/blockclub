"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error("Application error", error, { digest: error.digest });
  }, [error]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.icon}>!</h1>
        <h2 style={styles.title}>Something went wrong</h2>
        <p style={styles.message}>
          We encountered an unexpected error. Please try again.
        </p>
        <div style={styles.actions}>
          <button onClick={reset} style={styles.primaryButton}>
            Try Again
          </button>
          <a href="/dashboard" style={styles.secondaryButton}>
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  },
  card: {
    backgroundColor: "white",
    padding: "3rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
    color: "#333",
  },
  message: {
    color: "#666",
    marginBottom: "2rem",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    border: "none",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "1rem",
  },
  secondaryButton: {
    backgroundColor: "#f5f5f5",
    color: "#333",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
  },
};
