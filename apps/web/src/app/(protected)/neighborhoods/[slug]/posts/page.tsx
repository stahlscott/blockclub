import Link from "next/link";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
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

  // Fetch posts with author info
  // Note: RLS handles filtering deleted/expired posts for regular users
  // Admin client bypasses RLS for staff admins
  const { data: posts } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:users!author_id(id, name, avatar_url),
      editor:users!edited_by(id, name)
    `
    )
    .eq("neighborhood_id", neighborhood.id)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  // Fetch all reactions for these posts
  const postIds = posts?.map((p) => p.id) || [];
  const { data: reactions } = postIds.length
    ? await supabase
        .from("post_reactions")
        .select("*")
        .in("post_id", postIds)
    : { data: [] };

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
      <Link href="/dashboard" className={styles.backLink}>
        &larr; Dashboard
      </Link>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Posts</h1>
          <p className={styles.subtitle}>
            {postsWithReactions.length} post
            {postsWithReactions.length !== 1 ? "s" : ""} in {neighborhood.name}
          </p>
        </div>
        <Link href={`/neighborhoods/${slug}/posts/new`} className={styles.newButton} data-testid="posts-new-post-button">
          + New Post
        </Link>
      </div>

      <PostsClient
        posts={postsWithReactions}
        currentUserId={user.id}
        isAdmin={isNeighborhoodAdmin}
        slug={slug}
        neighborhoodId={neighborhood.id}
      />
    </div>
  );
}
