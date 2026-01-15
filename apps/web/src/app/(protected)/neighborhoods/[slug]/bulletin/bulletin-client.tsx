"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { BulletinReactionType } from "@frontporch/shared";

interface User {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Post {
  id: string;
  neighborhood_id: string;
  author_id: string;
  content: string;
  is_pinned: boolean;
  expires_at: string | null;
  edited_at: string | null;
  edited_by: string | null;
  created_at: string;
  author: User;
  editor?: User | null;
  reaction_counts: Record<BulletinReactionType, number>;
  user_reactions: BulletinReactionType[];
}

interface Props {
  posts: Post[];
  currentUserId: string;
  isAdmin: boolean;
  slug: string;
  neighborhoodId: string;
}

const REACTIONS: { type: BulletinReactionType; emoji: string; label: string }[] = [
  { type: "thumbs_up", emoji: "\uD83D\uDC4D", label: "Like" },
  { type: "heart", emoji: "\u2764\uFE0F", label: "Love" },
  { type: "pray", emoji: "\uD83D\uDE4F", label: "Thanks" },
  { type: "celebrate", emoji: "\uD83C\uDF89", label: "Celebrate" },
];

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  return name.replace(/^the\s+/i, "").charAt(0).toUpperCase() || "?";
}

export function BulletinClient({
  posts,
  currentUserId,
  isAdmin,
  slug,
}: Props) {
  const router = useRouter();
  const [loadingReaction, setLoadingReaction] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggleReaction(postId: string, reactionType: BulletinReactionType) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hasReacted = post.user_reactions.includes(reactionType);
    setLoadingReaction(`${postId}-${reactionType}`);
    setError("");

    try {
      const supabase = createClient();

      if (hasReacted) {
        // Remove reaction
        const { error: deleteError } = await supabase
          .from("bulletin_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId)
          .eq("reaction", reactionType);

        if (deleteError) throw deleteError;
      } else {
        // Add reaction
        const { error: insertError } = await supabase
          .from("bulletin_reactions")
          .insert({
            post_id: postId,
            user_id: currentUserId,
            reaction: reactionType,
          });

        if (insertError) throw insertError;
      }

      router.refresh();
    } catch (err: any) {
      logger.error("Error toggling reaction", err, { postId, reactionType });
      setError("Failed to update reaction");
    } finally {
      setLoadingReaction(null);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setDeletingPost(postId);
    setError("");

    try {
      const supabase = createClient();

      // Hard delete (soft delete via UPDATE was failing due to RLS issues)
      const { error: deleteError } = await supabase
        .from("bulletin_posts")
        .delete()
        .eq("id", postId);

      if (deleteError) throw deleteError;

      router.refresh();
    } catch (err: any) {
      logger.error("Error deleting post", err, { postId });
      setError("Failed to delete post");
    } finally {
      setDeletingPost(null);
    }
  }

  async function handleTogglePin(postId: string, currentlyPinned: boolean) {
    setError("");

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("bulletin_posts")
        .update({ is_pinned: !currentlyPinned })
        .eq("id", postId);

      if (updateError) throw updateError;

      router.refresh();
    } catch (err: any) {
      logger.error("Error toggling pin", err, { postId });
      setError("Failed to update pin status");
    }
  }

  if (posts.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>No posts yet. Be the first to share something!</p>
        <Link href={`/neighborhoods/${slug}/bulletin/new`} style={styles.emptyButton}>
          Create a Post
        </Link>
      </div>
    );
  }

  // Separate pinned and unpinned posts
  const pinnedPosts = posts.filter((p) => p.is_pinned);
  const regularPosts = posts.filter((p) => !p.is_pinned);

  return (
    <div style={styles.postList}>
      {error && <div style={styles.error}>{error}</div>}

      {pinnedPosts.length > 0 && (
        <div style={styles.pinnedSection}>
          <div style={styles.pinnedHeader}>
            <span style={styles.pinnedIcon}>{"\uD83D\uDCCC"}</span>
            <span style={styles.pinnedLabel}>Pinned</span>
          </div>
          {pinnedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              slug={slug}
              loadingReaction={loadingReaction}
              deletingPost={deletingPost}
              onToggleReaction={toggleReaction}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      )}

      {regularPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          slug={slug}
          loadingReaction={loadingReaction}
          deletingPost={deletingPost}
          onToggleReaction={toggleReaction}
          onDelete={handleDelete}
          onTogglePin={handleTogglePin}
        />
      ))}
    </div>
  );
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  slug: string;
  loadingReaction: string | null;
  deletingPost: string | null;
  onToggleReaction: (postId: string, reactionType: BulletinReactionType) => void;
  onDelete: (postId: string) => void;
  onTogglePin: (postId: string, currentlyPinned: boolean) => void;
}

function PostCard({
  post,
  currentUserId,
  isAdmin,
  slug,
  loadingReaction,
  deletingPost,
  onToggleReaction,
  onDelete,
  onTogglePin,
}: PostCardProps) {
  const isAuthor = post.author_id === currentUserId;
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;
  const canPin = isAdmin;

  return (
    <article style={styles.postCard}>
      <div style={styles.postHeader}>
        <Link
          href={`/neighborhoods/${slug}/members/${post.author.id}`}
          style={styles.authorLink}
        >
          {post.author.avatar_url ? (
            <Image
              src={post.author.avatar_url}
              alt={post.author.name}
              width={40}
              height={40}
              style={styles.avatar}
            />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {getInitial(post.author.name)}
            </div>
          )}
          <span style={styles.authorName}>{post.author.name}</span>
        </Link>
        <span style={styles.timestamp}>{formatRelativeTime(post.created_at)}</span>
      </div>

      {post.edited_at && (
        <p style={styles.editedNote}>
          Edited by {post.editor?.name || "Unknown"} on {formatDate(post.edited_at)}
        </p>
      )}

      <p style={styles.content}>{post.content}</p>

      <div style={styles.postFooter}>
        <div style={styles.reactions}>
          {REACTIONS.map((r) => {
            const count = post.reaction_counts[r.type] || 0;
            const hasReacted = post.user_reactions.includes(r.type);
            const isLoading = loadingReaction === `${post.id}-${r.type}`;

            return (
              <button
                key={r.type}
                onClick={() => onToggleReaction(post.id, r.type)}
                disabled={isLoading}
                title={r.label}
                style={{
                  ...styles.reactionButton,
                  ...(hasReacted ? styles.reactionActive : {}),
                  ...(isLoading ? styles.reactionLoading : {}),
                }}
              >
                <span style={styles.reactionEmoji}>{r.emoji}</span>
                <span style={styles.reactionCount}>{count}</span>
              </button>
            );
          })}
        </div>

        {post.expires_at && (
          <span style={styles.expiresTag}>Expires: {formatDate(post.expires_at)}</span>
        )}
      </div>

      {(canEdit || canDelete || canPin) && (
        <div style={styles.actions}>
          {canPin && (
            <button
              onClick={() => onTogglePin(post.id, post.is_pinned)}
              style={styles.actionButton}
            >
              {post.is_pinned ? "Unpin" : "Pin"}
            </button>
          )}
          {canEdit && (
            <Link
              href={`/neighborhoods/${slug}/bulletin/${post.id}/edit`}
              style={styles.actionLink}
            >
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(post.id)}
              disabled={deletingPost === post.id}
              style={styles.deleteButton}
            >
              {deletingPost === post.id ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  postList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  error: {
    padding: "0.75rem 1rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  pinnedSection: {
    backgroundColor: "#fef3c7",
    borderRadius: "8px",
    padding: "0.75rem",
    marginBottom: "0.5rem",
  },
  pinnedHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    marginBottom: "0.75rem",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#92400e",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  pinnedIcon: {
    fontSize: "0.875rem",
  },
  pinnedLabel: {},
  postCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  postHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
  },
  authorLink: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    textDecoration: "none",
    color: "inherit",
  },
  avatar: {
    borderRadius: "50%",
    objectFit: "cover",
  },
  avatarPlaceholder: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    color: "#3730a3",
    fontSize: "1rem",
  },
  authorName: {
    fontWeight: "500",
    fontSize: "0.9375rem",
  },
  timestamp: {
    fontSize: "0.8125rem",
    color: "#666",
  },
  editedNote: {
    margin: "0 0 0.75rem 0",
    fontSize: "0.75rem",
    color: "#666",
    fontStyle: "italic",
  },
  content: {
    margin: "0 0 1rem 0",
    fontSize: "0.9375rem",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  postFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  reactions: {
    display: "flex",
    gap: "0.375rem",
  },
  reactionButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    padding: "0.375rem 0.625rem",
    backgroundColor: "#f5f5f5",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "background-color 0.15s",
  },
  reactionActive: {
    backgroundColor: "#dbeafe",
    boxShadow: "inset 0 0 0 1px #93c5fd",
  },
  reactionLoading: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  reactionEmoji: {
    fontSize: "1rem",
    lineHeight: 1,
  },
  reactionCount: {
    fontSize: "0.8125rem",
    fontWeight: "500",
    color: "#333",
  },
  expiresTag: {
    fontSize: "0.75rem",
    color: "#666",
    backgroundColor: "#f5f5f5",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginTop: "0.75rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid #eee",
  },
  actionButton: {
    padding: "0.375rem 0.75rem",
    backgroundColor: "transparent",
    border: "none",
    color: "#2563eb",
    fontSize: "0.8125rem",
    cursor: "pointer",
    fontWeight: "500",
  },
  actionLink: {
    padding: "0.375rem 0.75rem",
    color: "#2563eb",
    fontSize: "0.8125rem",
    textDecoration: "none",
    fontWeight: "500",
  },
  deleteButton: {
    padding: "0.375rem 0.75rem",
    backgroundColor: "transparent",
    border: "none",
    color: "#dc2626",
    fontSize: "0.8125rem",
    cursor: "pointer",
    fontWeight: "500",
  },
  empty: {
    textAlign: "center",
    padding: "3rem 1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  emptyText: {
    color: "#666",
    marginBottom: "1rem",
  },
  emptyButton: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
  },
};
