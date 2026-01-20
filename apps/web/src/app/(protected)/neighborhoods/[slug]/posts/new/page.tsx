"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAX_LENGTHS } from "@/lib/validation";
import { PostImageUpload } from "@/components/PostImageUpload";
import { createPost } from "../actions";
import styles from "../post-form.module.css";

export default function NewPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, []);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(() => {
      createPost({
        slug,
        content,
        imageUrl,
        expiresAt: expiresAt || null,
      }).then((result) => {
        if (result.success) {
          router.push(`/neighborhoods/${slug}/posts`);
          router.refresh();
        } else {
          setError(result.error || "Something went wrong. Please try again.");
        }
      });
    });
  }

  return (
    <div className={styles.container}>
      <Link href={`/neighborhoods/${slug}/posts`} className={styles.backButton}>
        <ArrowLeft className={styles.backButtonIcon} />
        Back to Posts
      </Link>

      <h1 className={styles.pageTitle}>New Post</h1>
      <p className={styles.pageSubtitle}>
        Share something with your neighbors
      </p>

      <form onSubmit={handleSubmit} data-testid="posts-new-post-form">
        {error && <div className={styles.error} data-testid="posts-new-post-form-error">{error}</div>}

        <div className={styles.card}>
          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="content" className={styles.label}>
                Message <span className={styles.required}>*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Event announcement, lost pet, road closure notice..."
                rows={6}
                required
                maxLength={MAX_LENGTHS.postContent}
                className={styles.textarea}
                data-testid="posts-new-post-content-input"
              />
              <span className={styles.charCount}>
                {content.length}/{MAX_LENGTHS.postContent}
              </span>
            </div>

            {userId && (
              <PostImageUpload
                userId={userId}
                imageUrl={imageUrl}
                onImageChange={setImageUrl}
                onError={setError}
              />
            )}

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
                data-testid="posts-new-post-expires-input"
              />
              <span className={styles.hint}>
                Post will be automatically hidden after this date
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Link
            href={`/neighborhoods/${slug}/posts`}
            className={styles.cancelButton}
            data-testid="posts-new-post-cancel-button"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className={styles.submitButton}
            data-testid="posts-new-post-submit-button"
          >
            {isPending ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}
