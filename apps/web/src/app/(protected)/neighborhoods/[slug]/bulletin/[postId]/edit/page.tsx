"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS } from "@/lib/validation";

interface Post {
  id: string;
  neighborhood_id: string;
  author_id: string;
  content: string;
  is_pinned: boolean;
  expires_at: string | null;
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Helper to format date as YYYY-MM-DD in local timezone
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper to parse ISO date to YYYY-MM-DD
  const isoToDateInput = (isoString: string | null) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return formatDateLocal(date);
  };

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

        // Get post
        const { data: postData, error: postError } = await supabase
          .from("bulletin_posts")
          .select("*")
          .eq("id", postId)
          .single();

        if (postError || !postData) {
          setError("Post not found");
          return;
        }

        const userIsAuthor = postData.author_id === user.id;
        setIsAuthor(userIsAuthor);

        // Check if user can edit
        if (!userIsAuthor && !userIsAdmin) {
          setError("You don't have permission to edit this post");
          return;
        }

        setPost(postData);
        setContent(postData.content);
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
        expires_at: string | null;
        edited_at: string;
        edited_by: string;
        is_pinned?: boolean;
      } = {
        content: content.trim(),
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
        .from("bulletin_posts")
        .update(updateData)
        .eq("id", postId);

      if (updateError) {
        logger.error("Update error", updateError);
        setError(updateError.message);
        return;
      }

      router.push(`/neighborhoods/${slug}/bulletin`);
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
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div style={styles.container}>
        <Link href={`/neighborhoods/${slug}/bulletin`} style={styles.backLink}>
          &larr; Back to Bulletin Board
        </Link>
        <div style={styles.card}>
          <p style={styles.error}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Link href={`/neighborhoods/${slug}/bulletin`} style={styles.backLink}>
        &larr; Back to Bulletin Board
      </Link>

      <div style={styles.card}>
        <h1 style={styles.title}>Edit Post</h1>

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
              rows={6}
              required
              maxLength={MAX_LENGTHS.bulletinContent}
              style={styles.textarea}
            />
            <span style={styles.charCount}>
              {content.length}/{MAX_LENGTHS.bulletinContent}
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

          {isAdmin && (
            <div style={styles.field}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  style={styles.checkbox}
                />
                Pin this post to the top
              </label>
              <span style={styles.hint}>
                Pinned posts appear at the top of the bulletin board
              </span>
            </div>
          )}

          <div style={styles.actions}>
            <Link
              href={`/neighborhoods/${slug}/bulletin`}
              style={styles.cancelButton}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              style={{
                ...styles.submitButton,
                ...(saving || !content.trim() ? styles.submitButtonDisabled : {}),
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "1rem",
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
    margin: "0 0 1.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
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
  loadingText: {
    color: "#666",
    textAlign: "center",
    padding: "2rem",
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
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#333",
    cursor: "pointer",
  },
  checkbox: {
    width: "1rem",
    height: "1rem",
    cursor: "pointer",
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
