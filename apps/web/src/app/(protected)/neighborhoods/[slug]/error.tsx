"use client";

import { useEffect } from "react";
import { captureErrorBoundary } from "@/lib/sentry";
import styles from "../../../error-pages.module.css";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function NeighborhoodError({ error, reset }: ErrorProps) {
  useEffect(() => {
    captureErrorBoundary(error, "neighborhood");
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.icon}>!</h1>
        <h2 className={styles.title}>Something went wrong</h2>
        <p className={styles.message}>
          We encountered an error loading this neighborhood. Please try again.
        </p>
        <div className={styles.actions}>
          <button onClick={reset} className={styles.primaryButton}>
            Try Again
          </button>
          <a href="/dashboard" className={styles.secondaryButton}>
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
