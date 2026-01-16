"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS } from "@/lib/validation";

export default function NewPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Minimum date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = formatDateLocal(tomorrow);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }

      // Get neighborhood ID
      const { data: neighborhood } = await supabase
        .from("neighborhoods")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!neighborhood) {
        setError("Neighborhood not found");
        return;
      }

      // Verify membership
      const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("neighborhood_id", neighborhood.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .is("deleted_at", null)
        .single();

      if (!membership) {
        setError("You must be a member to post");
        return;
      }

      // Create post
      const { error: insertError } = await supabase.from("posts").insert({
        neighborhood_id: neighborhood.id,
        author_id: user.id,
        content: content.trim(),
        expires_at: expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null,
      });

      if (insertError) {
        logger.error("Insert error", insertError);
        setError(insertError.message);
        return;
      }

      router.push(`/neighborhoods/${slug}/posts`);
      router.refresh();
    } catch (err) {
      logger.error("Error creating post", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <Link href={`/neighborhoods/${slug}/posts`} style={styles.backLink}>
        &larr; Back to Posts
      </Link>

      <div style={styles.card}>
        <h1 style={styles.title}>New Post</h1>
        <p style={styles.subtitle}>
          Share something with your neighbors
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label htmlFor="content" style={styles.label}>
              Message *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Lost cat, block party announcement, road closure notice..."
              rows={6}
              required
              maxLength={MAX_LENGTHS.postContent}
              style={styles.textarea}
            />
            <span style={styles.charCount}>
              {content.length}/{MAX_LENGTHS.postContent}
            </span>
          </div>

          <div style={styles.field}>
            <label htmlFor="expiresAt" style={styles.label}>
              Expiration Date (optional)
            </label>
            <input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={minDate}
              style={styles.input}
            />
            <span style={styles.hint}>
              Post will be automatically hidden after this date
            </span>
          </div>

          <div style={styles.actions}>
            <Link
              href={`/neighborhoods/${slug}/posts`}
              style={styles.cancelButton}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              style={{
                ...styles.submitButton,
                ...(loading || !content.trim() ? styles.submitButtonDisabled : {}),
              }}
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    padding: "1.5rem 1rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1rem",
  },
  card: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  title: {
    margin: "0 0 0.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0 0 1.5rem 0",
    color: "#666",
    fontSize: "0.875rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  error: {
    padding: "0.75rem 1rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
  },
  textarea: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: "1.5",
  },
  charCount: {
    fontSize: "0.75rem",
    color: "#888",
    textAlign: "right",
  },
  hint: {
    fontSize: "0.75rem",
    color: "#888",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "flex-end",
    marginTop: "0.5rem",
  },
  cancelButton: {
    padding: "0.75rem 1.5rem",
    color: "#666",
    textDecoration: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  submitButton: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
    cursor: "not-allowed",
  },
};
