"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS } from "@/lib/validation";
import { PostImageUpload } from "@/components/PostImageUpload";
import styles from "../../post-form.module.css";

interface Post {
  id: string;
  neighborhood_id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  expires_at: string | null;
}

// Helper to format date as YYYY-MM-DD in local timezone
function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to parse ISO date to YYYY-MM-DD
function isoToDateInput(isoString: string | null) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return formatDateLocal(date);
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Minimum date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = formatDateLocal(tomorrow);

  useEffect(() => {
    async function loadPost() {
      setLoading(true);
      const supabase = createClient();

      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/signin");
          return;
        }

        // Get neighborhood
        const { data: neighborhood } = await supabase
          .from("neighborhoods")
          .select("id")
          .eq("slug", slug)
          .single();

        if (!neighborhood) {
          setError("Neighborhood not found");
          return;
        }

        // Get membership and check role
        const { data: membership } = await supabase
          .from("memberships")
          .select("role")
          .eq("neighborhood_id", neighborhood.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .is("deleted_at", null)
          .single();

        if (!membership) {
          setError("You must be a member to edit posts");
          return;
        }

        const userIsAdmin = membership.role === "admin";
        setIsAdmin(userIsAdmin);
        setUserId(user.id);

        // Get post
        const { data: postData, error: postError } = await supabase
          .from("posts")
          .select("*")
          .eq("id", postId)
          .single();

        if (postError || !postData) {
          setError("Post not found");
          return;
        }

        const userIsAuthor = postData.author_id === user.id;

        // Check if user can edit
        if (!userIsAuthor && !userIsAdmin) {
          setError("You don't have permission to edit this post");
          return;
        }

        setPost(postData);
        setContent(postData.content);
        setImageUrl(postData.image_url);
        setExpiresAt(isoToDateInput(postData.expires_at));
        setIsPinned(postData.is_pinned);
      } catch (err) {
        logger.error("Error loading post", err);
        setError("Failed to load post");
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [slug, postId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const supabase = createClient();

      // Get current user for edited_by
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }

      // Build update object
      const updateData: {
        content: string;
        image_url: string | null;
        expires_at: string | null;
        edited_at: string;
        edited_by: string;
        is_pinned?: boolean;
      } = {
        content: content.trim(),
        image_url: imageUrl,
        expires_at: expiresAt
          ? new Date(expiresAt + "T23:59:59").toISOString()
          : null,
        edited_at: new Date().toISOString(),
        edited_by: user.id,
      };

      // Only admins can change pin status
      if (isAdmin) {
        updateData.is_pinned = isPinned;
      }

      const { error: updateError } = await supabase
        .from("posts")
        .update(updateData)
        .eq("id", postId);

      if (updateError) {
        logger.error("Update error", updateError);
        setError(updateError.message);
        return;
      }

      router.push(`/neighborhoods/${slug}/posts`);
      router.refresh();
    } catch (err) {
      logger.error("Error updating post", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className={styles.container}>
        <Link href={`/neighborhoods/${slug}/posts`} className={styles.backLink}>
          &larr; Back to Posts
        </Link>
        <div className={styles.card}>
          <p className={styles.error}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href={`/neighborhoods/${slug}/posts`} className={styles.backLink}>
        &larr; Back to Posts
      </Link>

      <div className={styles.card}>
        <h1 className={styles.titleNoSubtitle}>Edit Post</h1>

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
              rows={6}
              required
              maxLength={MAX_LENGTHS.postContent}
              className={styles.textarea}
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
            />
            <span className={styles.hint}>
              Post will be automatically hidden after this date
            </span>
          </div>

          {isAdmin && (
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className={styles.checkbox}
                />
                Pin this post to the top
              </label>
              <span className={styles.hint}>
                Pinned posts appear at the top of the posts list
              </span>
            </div>
          )}

          <div className={styles.actions}>
            <Link
              href={`/neighborhoods/${slug}/posts`}
              className={styles.cancelButton}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className={styles.submitButton}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
