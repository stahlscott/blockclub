"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import styles from "./error-pages.module.css";

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
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.icon}>!</h1>
        <h2 className={styles.title}>Something went wrong</h2>
        <p className={styles.message}>
          We encountered an unexpected error. Please try again.
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
