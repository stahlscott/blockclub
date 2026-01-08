import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DirectoryPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
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

  // Check if user is a member
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    redirect(`/neighborhoods/${slug}`);
  }

  // Fetch all active members with their user profiles and households
  const { data: members } = await supabase
    .from("memberships")
    .select(`
      *,
      user:users(*),
      household:households(*)
    `)
    .eq("neighborhood_id", neighborhood.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  const isAdmin = membership.role === "admin";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <Link href="/dashboard" style={styles.backLink}>
            &larr; Dashboard
          </Link>
          <h1 style={styles.title}>Neighborhood Directory</h1>
          <p style={styles.subtitle}>
            {members?.length || 0} members in {neighborhood.name}
          </p>
        </div>
      </div>

      <div style={styles.memberGrid}>
        {members?.map((member: any) => (
          <Link
            key={member.id}
            href={`/neighborhoods/${slug}/members/${member.user.id}`}
            style={styles.memberCard}
          >
            <div style={styles.avatar}>
              {member.user.avatar_url ? (
                <img
                  src={member.user.avatar_url}
                  alt={member.user.name}
                  style={styles.avatarImg}
                />
              ) : (
                <span style={styles.avatarInitial}>
                  {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div style={styles.memberInfo}>
              <h3 style={styles.memberName}>
                {member.user.name}
                {member.role === "admin" && (
                  <span style={styles.adminBadge}>Admin</span>
                )}
              </h3>
              {member.household && (
                <p style={styles.memberAddress}>
                  {member.household.address}
                  {member.household.unit && `, ${member.household.unit}`}
                </p>
              )}
              {member.user.bio && (
                <p style={styles.memberBio}>
                  {member.user.bio.length > 80
                    ? `${member.user.bio.substring(0, 80)}...`
                    : member.user.bio}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {(!members || members.length === 0) && (
        <div style={styles.emptyState}>
          <p>No members yet. Be the first to invite neighbors!</p>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  header: {
    marginBottom: "2rem",
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
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0.25rem 0 0 0",
    color: "#666",
  },
  memberGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1rem",
  },
  memberCard: {
    display: "flex",
    gap: "1rem",
    padding: "1.25rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
    transition: "box-shadow 0.15s ease",
  },
  avatar: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarInitial: {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#3730a3",
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    margin: "0 0 0.25rem 0",
    fontSize: "1rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  adminBadge: {
    fontSize: "0.625rem",
    fontWeight: "500",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "0.125rem 0.375rem",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  memberAddress: {
    margin: "0 0 0.25rem 0",
    fontSize: "0.875rem",
    color: "#666",
  },
  memberBio: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#888",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem",
    color: "#666",
  },
};
