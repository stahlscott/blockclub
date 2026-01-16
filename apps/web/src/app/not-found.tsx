import Link from "next/link";
import styles from "./error-pages.module.css";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Page Not Found</h2>
        <p className={styles.message}>
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div className={styles.actions}>
          <Link href="/dashboard" className={styles.primaryButton}>
            Go to Dashboard
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
