"use client";

import { useState, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/Modal";
import { deletePost, setPostPinned, togglePostReaction } from "./actions";
import { ImageLightbox } from "@/components/ImageLightbox";
import { InviteNudge } from "@/components/InviteNudge";
import { formatRelativeTime, formatDate } from "@/lib/date-utils";
import { isInGrowthMode, shouldShowContentNudge } from "@/lib/growth";
import { useInvite } from "@/lib/hooks/useInvite";
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
  memberCount: number;
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
  memberCount,
}: Props) {
  const router = useRouter();
  const [loadingReaction, setLoadingReaction] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [deleteDialogPostId, setDeleteDialogPostId] = useState<string | null>(null);
  const [loadingPin, setLoadingPin] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { handleInvite, modal: inviteModal } = useInvite(slug);
  const growthMode = isInGrowthMode(memberCount);

  const toggleReaction = useCallback(async (postId: string, reactionType: PostReactionType) => {
    setLoadingReaction(`${postId}-${reactionType}`);
    setError("");
    const result = await togglePostReaction({ slug, postId, reaction: reactionType });
    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoadingReaction(null);
  }, [router, slug]);

  const requestDelete = useCallback((postId: string) => {
    setDeleteDialogPostId(postId);
    setError("");
  }, []);

  const handleDelete = useCallback(async (postId: string) => {
    setDeletingPost(postId);
    setError("");
    const result = await deletePost({ slug, postId });
    if (!result.success) {
      setError(result.error);
    } else {
      setDeleteDialogPostId(null);
      router.refresh();
    }
    setDeletingPost(null);
  }, [router, slug]);

  const handleTogglePin = useCallback(async (postId: string, currentlyPinned: boolean) => {
    setLoadingPin(postId);
    setError("");
    const result = await setPostPinned({ slug, postId, pinned: !currentlyPinned });
    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoadingPin(null);
  }, [router, slug]);

  if (posts.length === 0) {
    return (
      <>
        <div className={styles.empty}>
          <div className={styles.emptyIllustration}>📌</div>
          <p className={styles.emptyText}>
            The board is empty, pin something up for your neighbors!
          </p>
          <Link href={`/neighborhoods/${slug}/posts/new`} className={styles.emptyButton}>
            Post something
          </Link>
          {growthMode && (
            <p className={styles.emptyInvite}>
              or{" "}
              <button
                onClick={handleInvite}
                className={styles.emptyInviteButton}
                type="button"
              >
                invite neighbors
              </button>
              {" "}to start the conversation
            </p>
          )}
        </div>
        {inviteModal}
      </>
    );
  }

  // Separate pinned and unpinned posts
  const pinnedPosts = posts.filter((p) => p.is_pinned);
  const regularPosts = posts.filter((p) => !p.is_pinned);

  return (
    <>
      <div className={styles.postList}>
        {error && <div className={styles.error}>{error}</div>}

      {pinnedPosts.length > 0 && (
        <div className={styles.pinnedSection}>
          {pinnedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              slug={slug}
              loadingReaction={loadingReaction}
              deletingPost={deletingPost}
              loadingPin={loadingPin}
              onToggleReaction={toggleReaction}
              onDelete={requestDelete}
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
          loadingPin={loadingPin}
          onToggleReaction={toggleReaction}
          onDelete={requestDelete}
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

      <Modal open={deleteDialogPostId !== null} onOpenChange={(open) => !open && setDeleteDialogPostId(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete this post?</ModalTitle>
            <ModalDescription>
              The post will be hidden from the neighborhood board. Its reactions and history will be preserved.
            </ModalDescription>
          </ModalHeader>
          <div className={styles.actionsRight}>
            <button type="button" className={styles.actionButton} onClick={() => setDeleteDialogPostId(null)} disabled={deletingPost !== null}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => deleteDialogPostId && handleDelete(deleteDialogPostId)}
              disabled={deletingPost !== null}
              data-testid="posts-delete-confirm-button"
            >
              {deletingPost ? "Deleting..." : "Delete"}
            </button>
          </div>
        </ModalContent>
      </Modal>
      </div>

      {growthMode && shouldShowContentNudge(posts.length, "posts") && (
        <InviteNudge slug={slug} section="posts" />
      )}
      {inviteModal}
    </>

  );
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  slug: string;
  loadingReaction: string | null;
  deletingPost: string | null;
  loadingPin: string | null;
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
  loadingPin,
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

  const heartClassName = [
    styles.heartButton,
    hasReactedHeart && styles.heartButtonActive,
    isHeartLoading && styles.heartButtonLoading,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={styles.postCard}>
      {post.is_pinned && (
        <div className={styles.pinnedHeader}>
          <span className={styles.pinnedIcon}>📌</span>
          <span>Pinned</span>
        </div>
      )}
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
            sizes="40px"
            wrapperClassName={styles.avatarWrapper}
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
              sizes="(max-width: 768px) 100vw, 800px"
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
            type="button"
            onClick={() => onToggleReaction(post.id, "heart")}
            disabled={isHeartLoading}
            aria-label={hasReactedHeart ? "Remove heart reaction" : "React with heart"}
            aria-pressed={hasReactedHeart}
            className={heartClassName}
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
                type="button"
                onClick={() => onTogglePin(post.id, post.is_pinned)}
                className={styles.actionButton}
                disabled={loadingPin === post.id}
              >
                {loadingPin === post.id ? "Saving..." : post.is_pinned ? "Unpin" : "Pin"}
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
