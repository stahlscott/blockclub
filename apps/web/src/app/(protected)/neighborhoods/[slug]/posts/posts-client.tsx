"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { PostReactionType } from "@blockclub/shared";
import styles from "./posts.module.css";

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
  reaction_counts: Record<PostReactionType, number>;
  user_reactions: PostReactionType[];
}

interface Props {
  posts: Post[];
  currentUserId: string;
  isAdmin: boolean;
  slug: string;
  neighborhoodId: string;
}

const REACTIONS: { type: PostReactionType; emoji: string; label: string }[] = [
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

export function PostsClient({
  posts,
  currentUserId,
  isAdmin,
  slug,
}: Props) {
  const router = useRouter();
  const [loadingReaction, setLoadingReaction] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggleReaction(postId: string, reactionType: PostReactionType) {
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
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId)
          .eq("reaction", reactionType);

        if (deleteError) throw deleteError;
      } else {
        // Add reaction
        const { error: insertError } = await supabase
          .from("post_reactions")
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
        .from("posts")
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
        .from("posts")
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
      <div className={styles.empty}>
        <div className={styles.emptyIllustration}>💬</div>
        <p className={styles.emptyText}>
          It&apos;s quiet here. Start a conversation with your neighbors!
        </p>
        <Link href={`/neighborhoods/${slug}/posts/new`} className={styles.emptyButton}>
          Create a Post
        </Link>
      </div>
    );
  }

  // Separate pinned and unpinned posts
  const pinnedPosts = posts.filter((p) => p.is_pinned);
  const regularPosts = posts.filter((p) => !p.is_pinned);

  return (
    <div className={styles.postList}>
      {error && <div className={styles.error}>{error}</div>}

      {pinnedPosts.length > 0 && (
        <div className={styles.pinnedSection}>
          <div className={styles.pinnedHeader}>
            <span className={styles.pinnedIcon}>{"\uD83D\uDCCC"}</span>
            <span>Pinned</span>
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
  onToggleReaction: (postId: string, reactionType: PostReactionType) => void;
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

  const getReactionClassName = (hasReacted: boolean, isLoading: boolean) => {
    let className = styles.reactionButton;
    if (hasReacted) className += ` ${styles.reactionActive}`;
    if (isLoading) className += ` ${styles.reactionLoading}`;
    return className;
  };

  return (
    <article className={styles.postCard}>
      <div className={styles.postHeader}>
        <Link
          href={`/neighborhoods/${slug}/members/${post.author.id}`}
          className={styles.authorLink}
        >
          {post.author.avatar_url ? (
            <Image
              src={post.author.avatar_url}
              alt={post.author.name}
              width={40}
              height={40}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {getInitial(post.author.name)}
            </div>
          )}
          <span className={styles.authorName}>{post.author.name}</span>
        </Link>
        <span className={styles.timestamp}>{formatRelativeTime(post.created_at)}</span>
      </div>

      {post.edited_at && (
        <p className={styles.editedNote}>
          Edited by {post.editor?.name || "Unknown"} on {formatDate(post.edited_at)}
        </p>
      )}

      <p className={styles.content}>{post.content}</p>

      <div className={styles.postFooter}>
        <div className={styles.reactions}>
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
                className={getReactionClassName(hasReacted, isLoading)}
              >
                <span className={styles.reactionEmoji}>{r.emoji}</span>
                <span className={styles.reactionCount}>{count}</span>
              </button>
            );
          })}
        </div>

        {post.expires_at && (
          <span className={styles.expiresTag}>Expires: {formatDate(post.expires_at)}</span>
        )}
      </div>

      {(canEdit || canDelete || canPin) && (
        <div className={styles.actions}>
          {canPin && (
            <button
              onClick={() => onTogglePin(post.id, post.is_pinned)}
              className={styles.actionButton}
            >
              {post.is_pinned ? "Unpin" : "Pin"}
            </button>
          )}
          {canEdit && (
            <Link
              href={`/neighborhoods/${slug}/posts/${post.id}/edit`}
              className={styles.actionLink}
            >
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(post.id)}
              disabled={deletingPost === post.id}
              className={styles.deleteButton}
            >
              {deletingPost === post.id ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
