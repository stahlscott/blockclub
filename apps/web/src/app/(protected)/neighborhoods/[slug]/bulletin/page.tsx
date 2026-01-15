import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BulletinClient } from "./bulletin-client";
import type { BulletinReactionType } from "@frontporch/shared";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BulletinPage({ params }: Props) {
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
    .from("bulletin_posts")
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
        .from("bulletin_reactions")
        .select("*")
        .in("post_id", postIds)
    : { data: [] };

  // Aggregate reactions per post
  const postsWithReactions =
    posts?.map((post) => {
      const postReactions = reactions?.filter((r) => r.post_id === post.id) || [];

      // Count reactions by type
      const reactionTypes: BulletinReactionType[] = [
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
        {} as Record<BulletinReactionType, number>
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
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <Link href="/dashboard" style={styles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 style={styles.title}>Bulletin Board</h1>
          <p style={styles.subtitle}>
            {postsWithReactions.length} post
            {postsWithReactions.length !== 1 ? "s" : ""} in {neighborhood.name}
          </p>
        </div>
        <Link href={`/neighborhoods/${slug}/bulletin/new`} style={styles.newButton}>
          + New Post
        </Link>
      </div>

      <BulletinClient
        posts={postsWithReactions}
        currentUserId={user.id}
        isAdmin={isAdmin}
        slug={slug}
        neighborhoodId={neighborhood.id}
      />
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "1.5rem 1rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "0.5rem",
  },
  title: {
    margin: "0",
    fontSize: "1.75rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0.25rem 0 0 0",
    color: "#666",
    fontSize: "0.875rem",
  },
  newButton: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.25rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
    fontSize: "0.875rem",
  },
};
