import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { MembershipActions } from "./membership-actions";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PendingMembersPage({ params }: Props) {
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

  // Check if user is admin (neighborhood admin or super admin)
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const isNeighborhoodAdmin = membership?.role === "admin";
  const userIsSuperAdmin = isSuperAdmin(user.email);

  if (!isNeighborhoodAdmin && !userIsSuperAdmin) {
    redirect(`/neighborhoods/${slug}`);
  }

  // Fetch pending memberships
  const { data: pendingMembers } = await supabase
    .from("memberships")
    .select("*, user:users(id, name, email, avatar_url)")
    .eq("neighborhood_id", neighborhood.id)
    .eq("status", "pending")
    .order("joined_at", { ascending: true });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href={`/neighborhoods/${slug}`} style={styles.backLink}>
          &larr; {neighborhood.name}
        </Link>
        <h1 style={styles.title}>Pending Requests</h1>
        <p style={styles.subtitle}>
          {pendingMembers?.length || 0} people waiting to join
        </p>
      </div>

      {pendingMembers && pendingMembers.length > 0 ? (
        <div style={styles.list}>
          {pendingMembers.map((member: any) => {
            const userName = member.user?.name;
            const userEmail = member.user?.email;
            const hasProfile = !!member.user;
            const initial = userName?.charAt(0)?.toUpperCase() || userEmail?.charAt(0)?.toUpperCase() || "?";
            
            return (
              <div key={member.id} style={styles.card}>
                <div style={styles.memberInfo}>
                  <div style={styles.avatar}>
                    {member.user?.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt={userName || "User"}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>
                  <div style={styles.details}>
                    {hasProfile ? (
                      <>
                        <h3 style={styles.name}>
                          {userName || <span style={styles.noName}>No name set</span>}
                        </h3>
                        <p style={styles.email}>{userEmail}</p>
                      </>
                    ) : (
                      <>
                        <h3 style={styles.name}>
                          <span style={styles.noName}>Profile not found</span>
                        </h3>
                        <p style={styles.userId}>User ID: {member.user_id.slice(0, 8)}...</p>
                      </>
                    )}
                    <p style={styles.date}>
                      Requested {new Date(member.joined_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <MembershipActions membershipId={member.id} slug={slug} />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No pending requests</p>
          <Link href={`/neighborhoods/${slug}/directory`} style={styles.emptyLink}>
            View current members
          </Link>
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
    fontSize: "1.75rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0.25rem 0 0 0",
    color: "#666",
    fontSize: "0.875rem",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.25rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  memberInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    color: "#3730a3",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  details: {
    display: "flex",
    flexDirection: "column",
    gap: "0.125rem",
  },
  name: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "600",
  },
  noName: {
    color: "#999",
    fontStyle: "italic",
    fontWeight: "400",
  },
  email: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#2563eb",
  },
  userId: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#999",
    fontFamily: "monospace",
  },
  date: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#999",
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
  emptyLink: {
    color: "#2563eb",
    textDecoration: "none",
  },
};
