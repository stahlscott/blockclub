"use client";

import { useState, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OptimizedImage } from "@/components/OptimizedImage";
import { logger } from "@/lib/logger";
import { ImageLightbox } from "@/components/ImageLightbox";
import { formatRelativeTime, formatDate } from "@/lib/date-utils";
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
  image_url: string | null;
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const toggleReaction = useCallback(async (postId: string, reactionType: PostReactionType) => {
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
  }, [posts, currentUserId, router]);

  const handleDelete = useCallback(async (postId: string) => {
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
  }, [router]);

  const handleTogglePin = useCallback(async (postId: string, currentlyPinned: boolean) => {
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
  }, [router]);

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
              onImageClick={setLightboxImage}
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
          onImageClick={setLightboxImage}
        />
      ))}

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          alt="Post image"
          onClose={() => setLightboxImage(null)}
        />
      )}
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
  onImageClick: (imageUrl: string) => void;
}

const PostCard = memo(function PostCard({
  post,
  currentUserId,
  isAdmin,
  slug,
  loadingReaction,
  deletingPost,
  onToggleReaction,
  onDelete,
  onTogglePin,
  onImageClick,
}: PostCardProps) {
  const isAuthor = post.author_id === currentUserId;
  const canEdit = isAuthor || isAdmin;
  const canDelete = isAuthor || isAdmin;
  const canPin = isAdmin;

  const heartCount = post.reaction_counts.heart || 0;
  const hasReactedHeart = post.user_reactions.includes("heart");
  const isHeartLoading = loadingReaction === `${post.id}-heart`;

  const getHeartClassName = () => {
    let className = styles.heartButton;
    if (hasReactedHeart) className += ` ${styles.heartButtonActive}`;
    if (isHeartLoading) className += ` ${styles.heartButtonLoading}`;
    return className;
  };

  return (
    <article className={styles.postCard}>
      <div className={styles.postHeader}>
        <Link
          href={`/neighborhoods/${slug}/members/${post.author.id}`}
          className={styles.authorLink}
        >
          <OptimizedImage
            src={post.author.avatar_url}
            alt={post.author.name}
            width={40}
            height={40}
            className={styles.avatar}
            borderRadius="50%"
            fallback={
              <div className={styles.avatarPlaceholder}>
                {getInitial(post.author.name)}
              </div>
            }
          />
          <span className={styles.authorName}>{post.author.name}</span>
        </Link>
        <span className={styles.timestamp}>{formatRelativeTime(post.created_at)}</span>
      </div>

      {post.edited_at && (
        <p className={styles.editedNote}>
          Edited by {post.editor?.name || "Unknown"} on {formatDate(post.edited_at)}
        </p>
      )}

      {post.image_url && (
        <button
          type="button"
          className={styles.postImageButton}
          onClick={() => onImageClick(post.image_url!)}
          aria-label="View full image"
        >
          <div className={styles.postImageContainer}>
            <OptimizedImage
              src={post.image_url}
              alt="Post image"
              width={800}
              height={600}
              className={styles.postImage}
              borderRadius="var(--radius-lg)"
            />
          </div>
        </button>
      )}

      <p className={styles.content}>{post.content}</p>

      <div className={styles.postFooter}>
        {isAuthor ? (
          // Author sees static count only if there are reactions
          heartCount > 0 && (
            <span className={styles.heartDisplay}>
              <span className={styles.heartEmoji}>{"\u2764\uFE0F"}</span>
              <span className={styles.heartCount}>{heartCount}</span>
            </span>
          )
        ) : (
          // Non-authors can interact
          <button
            onClick={() => onToggleReaction(post.id, "heart")}
            disabled={isHeartLoading}
            title="Love"
            className={getHeartClassName()}
          >
            <span className={styles.heartEmoji}>{hasReactedHeart ? "\u2764\uFE0F" : "\uD83E\uDD0D"}</span>
            {heartCount > 0 && <span className={styles.heartCount}>{heartCount}</span>}
          </button>
        )}

        {post.expires_at && (
          <span className={styles.expiresTag}>Expires: {formatDate(post.expires_at)}</span>
        )}
      </div>

      {(canEdit || canDelete || canPin) && (
        <div className={styles.actions}>
          <div className={styles.actionsLeft}>
            {canPin && (
              <button
                onClick={() => onTogglePin(post.id, post.is_pinned)}
                className={styles.actionButton}
              >
                {post.is_pinned ? "Unpin" : "Pin"}
              </button>
            )}
          </div>
          <div className={styles.actionsRight}>
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
        </div>
      )}
    </article>
  );
});
