import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostsClient } from "./posts-client";
import type { PostReactionType } from "@blockclub/shared";
import styles from "./posts-page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PostsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  // Fetch neighborhood
  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!neighborhood) {
    notFound();
  }

  // Check if user is a member and get their role
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();

  if (!membership) {
    redirect(`/neighborhoods/${slug}`);
  }

  const isAdmin = membership.role === "admin";

  // Fetch posts with author info
  // Note: RLS handles filtering deleted/expired posts
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
      <div className={styles.header}>
        <div>
          <Link href="/dashboard" className={styles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 className={styles.title}>Posts</h1>
          <p className={styles.subtitle}>
            {postsWithReactions.length} post
            {postsWithReactions.length !== 1 ? "s" : ""} in {neighborhood.name}
          </p>
        </div>
        <Link href={`/neighborhoods/${slug}/posts/new`} className={styles.newButton}>
          + New Post
        </Link>
      </div>

      <PostsClient
        posts={postsWithReactions}
        currentUserId={user.id}
        isAdmin={isAdmin}
        slug={slug}
        neighborhoodId={neighborhood.id}
      />
    </div>
  );
}
