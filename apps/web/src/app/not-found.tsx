import Link from "next/link";

export default function NotFound() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.code}>404</h1>
        <h2 style={styles.title}>Page Not Found</h2>
        <p style={styles.message}>
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <div style={styles.actions}>
          <Link href="/dashboard" style={styles.primaryButton}>
            Go to Dashboard
          </Link>
          <Link href="/" style={styles.secondaryButton}>
            Go Home
          </Link>
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
  code: {
    fontSize: "4rem",
    fontWeight: "700",
    color: "#e5e5e5",
    margin: "0 0 0.5rem 0",
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
    textDecoration: "none",
    fontWeight: "500",
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
