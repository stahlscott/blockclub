import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import { getPostReactions, getPostsByNeighborhood } from "@/lib/queries";
import { PostsClient } from "./posts-client";
import type { PostReactionType } from "@blockclub/shared";
import styles from "./posts-page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PostsPage({ params }: Props) {
  const { slug } = await params;
  const { user, neighborhood, isNeighborhoodAdmin, supabase } =
    await getNeighborhoodAccess(slug);

  // Fetch posts and active member count in parallel.
  const [{ data: posts }, { count: memberCount }] = await Promise.all([
    getPostsByNeighborhood(supabase, neighborhood.id),
    supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "active")
      .is("deleted_at", null),
  ]);

  const postIds = posts?.map((p) => p.id) || [];
  const { data: reactions } = await getPostReactions(supabase, postIds);

  // Aggregate reactions per post
  const postsWithReactions =
    posts?.map((post) => {
      const postReactions = reactions?.filter((r) => r.post_id === post.id) || [];

      // Count reactions by type
      const reactionTypes: PostReactionType[] = [
        "thumbs_up",
        "heart",
        "pray",
        "celebrate",
      ];
      const reaction_counts = reactionTypes.reduce(
        (acc, type) => {
          acc[type] = postReactions.filter((r) => r.reaction === type).length;
          return acc;
        },
        {} as Record<PostReactionType, number>
      );

      // Get current user's reactions
      const user_reactions = postReactions
        .filter((r) => r.user_id === user.id)
        .map((r) => r.reaction);

      return {
        ...post,
        reaction_counts,
        user_reactions,
      };
    }) || [];

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <Link href="/dashboard" className={styles.backButton}>
          <ArrowLeft className={styles.backButtonIcon} />
          Dashboard
        </Link>
        <Link href={`/neighborhoods/${slug}/posts/new`} className={styles.newButton} data-testid="posts-new-post-button">
          + New Post
        </Link>
      </div>
      <div className={styles.header}>
        <h1 className={styles.title}>Posts</h1>
        <p className={styles.subtitle}>
          {postsWithReactions.length} post
          {postsWithReactions.length !== 1 ? "s" : ""} in {neighborhood.name}
        </p>
      </div>

      <PostsClient
        posts={postsWithReactions}
        currentUserId={user.id}
        isAdmin={isNeighborhoodAdmin}
        slug={slug}
        memberCount={memberCount || 0}
      />
    </div>
  );
}
