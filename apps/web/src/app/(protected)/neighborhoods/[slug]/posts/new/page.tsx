"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { MAX_LENGTHS } from "@/lib/validation";
import { createPost } from "../actions";
import styles from "../post-form.module.css";

export default function NewPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPending, startTransition] = useTransition();
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

    startTransition(async () => {
      const result = await createPost({
        slug,
        content,
        expiresAt: expiresAt || null,
      });

      if (result.success) {
        router.push(`/neighborhoods/${slug}/posts`);
        router.refresh();
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className={styles.container}>
      <Link href={`/neighborhoods/${slug}/posts`} className={styles.backLink}>
        &larr; Back to Posts
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>New Post</h1>
        <p className={styles.subtitle}>
          Share something with your neighbors
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="content" className={styles.label}>
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
              className={styles.textarea}
            />
            <span className={styles.charCount}>
              {content.length}/{MAX_LENGTHS.postContent}
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="expiresAt" className={styles.label}>
              Expiration Date (optional)
            </label>
            <input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={minDate}
              className={styles.input}
            />
            <span className={styles.hint}>
              Post will be automatically hidden after this date
            </span>
          </div>

          <div className={styles.actions}>
            <Link
              href={`/neighborhoods/${slug}/posts`}
              className={styles.cancelButton}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className={styles.submitButton}
            >
              {isPending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
