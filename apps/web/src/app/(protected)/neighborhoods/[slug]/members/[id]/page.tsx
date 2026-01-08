import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { RoleActions } from "./role-actions";

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export default async function MemberProfilePage({ params }: Props) {
  const { slug, id } = await params;
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

  // Check if current user is a member
  const { data: currentMembership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!currentMembership) {
    redirect(`/neighborhoods/${slug}`);
  }

  // Fetch the member's profile
  const { data: member } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!member) {
    notFound();
  }

  // Fetch member's membership for this neighborhood
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", id)
    .eq("status", "active")
    .single();

  if (!membership) {
    notFound();
  }

  // Fetch member's items in this neighborhood
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("owner_id", id)
    .order("created_at", { ascending: false })
    .limit(6);

  const isOwnProfile = user.id === id;
  const userIsSuperAdmin = isSuperAdmin(user.email);
  const isNeighborhoodAdmin = currentMembership.role === "admin";
  const isAdmin = isNeighborhoodAdmin || userIsSuperAdmin;

  // Determine role change permissions
  // Can promote: super admin or neighborhood admin (if target is member)
  // Can demote: super admin only (if target is admin)
  const canPromote =
    (userIsSuperAdmin || isNeighborhoodAdmin) &&
    membership.role === "member" &&
    !isOwnProfile;
  const canDemote =
    userIsSuperAdmin && membership.role === "admin" && !isOwnProfile;

  return (
    <div style={styles.container}>
      <Link href={`/neighborhoods/${slug}/directory`} style={styles.backLink}>
        &larr; Back to Directory
      </Link>

      <div style={styles.profileHeader}>
        <div style={styles.avatar}>
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.name}
              style={styles.avatarImg}
            />
          ) : (
            <span style={styles.avatarInitial}>
              {member.name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
        </div>

        <div style={styles.profileInfo}>
          <h1 style={styles.name}>
            {member.name}
            {membership.role === "admin" && (
              <span style={styles.adminBadge}>Admin</span>
            )}
          </h1>

          {member.address && (
            <p style={styles.address}>
              {member.address}
              {member.unit && `, ${member.unit}`}
              {member.move_in_year && (
                <span style={styles.moveInYear}>
                  {" "}
                  - Moved in {member.move_in_year}
                </span>
              )}
            </p>
          )}

          {member.bio && <p style={styles.bio}>{member.bio}</p>}

          {isOwnProfile && (
            <Link href="/profile" style={styles.editButton}>
              Edit Profile
            </Link>
          )}

          {!isOwnProfile && (canPromote || canDemote) && (
            <RoleActions
              membershipId={membership.id}
              currentRole={membership.role}
              canPromote={canPromote}
              canDemote={canDemote}
              memberName={member.name}
            />
          )}
        </div>
      </div>

      {(member.children || member.pets) && (
        <div style={styles.familySection}>
          <h2 style={styles.sectionTitle}>Family & Pets</h2>
          <div style={styles.familyGrid}>
            {member.children && (
              <div style={styles.familyCard}>
                <span style={styles.familyIcon}>👶</span>
                <div style={styles.familyContent}>
                  <span style={styles.familyLabel}>Children</span>
                  <span style={styles.familyValue}>{member.children}</span>
                </div>
              </div>
            )}
            {member.pets && (
              <div style={styles.familyCard}>
                <span style={styles.familyIcon}>🐾</span>
                <div style={styles.familyContent}>
                  <span style={styles.familyLabel}>Pets</span>
                  <span style={styles.familyValue}>{member.pets}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.contactSection}>
        <h2 style={styles.sectionTitle}>Contact</h2>
        <div style={styles.contactGrid}>
          {member.email && (
            <a href={`mailto:${member.email}`} style={styles.contactCard}>
              <span style={styles.contactIcon}>📧</span>
              <span style={styles.contactLabel}>Email</span>
              <span style={styles.contactValue}>{member.email}</span>
            </a>
          )}
          {/* Show multiple phones if available, otherwise fall back to legacy phone field */}
          {member.phones && member.phones.length > 0 ? (
            member.phones.map(
              (phone: { label: string; number: string }, index: number) => (
                <a
                  key={index}
                  href={`tel:${phone.number}`}
                  style={styles.contactCard}
                >
                  <span style={styles.contactIcon}>📱</span>
                  <span style={styles.contactLabel}>
                    {phone.label || "Phone"}
                  </span>
                  <span style={styles.contactValue}>
                    {phone.number.replace(
                      /(\d{3})(\d{3})(\d{4})/,
                      "($1) $2-$3",
                    )}
                  </span>
                </a>
              ),
            )
          ) : member.phone ? (
            <a href={`tel:${member.phone}`} style={styles.contactCard}>
              <span style={styles.contactIcon}>📱</span>
              <span style={styles.contactLabel}>Phone</span>
              <span style={styles.contactValue}>{member.phone}</span>
            </a>
          ) : null}
          {/* Text link - use first phone number */}
          {(member.phones?.[0]?.number || member.phone) && (
            <a
              href={`sms:${member.phones?.[0]?.number || member.phone}`}
              style={styles.contactCard}
            >
              <span style={styles.contactIcon}>💬</span>
              <span style={styles.contactLabel}>Text</span>
              <span style={styles.contactValue}>Send a message</span>
            </a>
          )}
        </div>
      </div>

      {items && items.length > 0 && (
        <div style={styles.itemsSection}>
          <h2 style={styles.sectionTitle}>
            {isOwnProfile
              ? "Your Items"
              : `${member.name.split(" ")[0]}'s Items`}
          </h2>
          <div style={styles.itemGrid}>
            {items.map((item: any) => (
              <div key={item.id} style={styles.itemCard}>
                <h3 style={styles.itemName}>{item.name}</h3>
                {item.description && (
                  <p style={styles.itemDescription}>
                    {item.description.length > 60
                      ? `${item.description.substring(0, 60)}...`
                      : item.description}
                  </p>
                )}
                <div style={styles.itemFooter}>
                  <span style={styles.itemCategory}>{item.category}</span>
                  <span
                    style={{
                      ...styles.itemStatus,
                      backgroundColor:
                        item.availability === "available"
                          ? "#d1fae5"
                          : "#fee2e2",
                      color:
                        item.availability === "available"
                          ? "#065f46"
                          : "#991b1b",
                    }}
                  >
                    {item.availability}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.memberSince}>
        Member since{" "}
        {new Date(membership.joined_at).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </div>
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
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1.5rem",
  },
  profileHeader: {
    display: "flex",
    gap: "1.5rem",
    marginBottom: "2rem",
    padding: "1.5rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  avatar: {
    width: "100px",
    height: "100px",
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
    fontSize: "2.5rem",
    fontWeight: "600",
    color: "#3730a3",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    margin: "0 0 0.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  adminBadge: {
    fontSize: "0.625rem",
    fontWeight: "500",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    textTransform: "uppercase",
  },
  address: {
    margin: "0 0 0.5rem 0",
    color: "#666",
  },
  moveInYear: {
    color: "#888",
    fontSize: "0.875rem",
  },
  bio: {
    margin: "0 0 1rem 0",
    color: "#444",
  },
  editButton: {
    display: "inline-block",
    padding: "0.5rem 1rem",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "0.875rem",
  },
  familySection: {
    marginBottom: "2rem",
  },
  familyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "0.75rem",
  },
  familyCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    padding: "1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  familyIcon: {
    fontSize: "1.5rem",
    flexShrink: 0,
  },
  familyContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  familyLabel: {
    fontSize: "0.75rem",
    color: "#666",
    textTransform: "uppercase",
  },
  familyValue: {
    fontSize: "0.875rem",
    color: "#333",
    whiteSpace: "pre-line",
  },
  contactSection: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    margin: "0 0 1rem 0",
    fontSize: "1.125rem",
    fontWeight: "600",
  },
  contactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "0.75rem",
  },
  contactCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    padding: "1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
  },
  contactIcon: {
    fontSize: "1.5rem",
  },
  contactLabel: {
    fontSize: "0.75rem",
    color: "#666",
    textTransform: "uppercase",
  },
  contactValue: {
    fontSize: "0.875rem",
    color: "#2563eb",
    textAlign: "center",
  },
  itemsSection: {
    marginBottom: "2rem",
  },
  itemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "0.75rem",
  },
  itemCard: {
    padding: "1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  itemName: {
    margin: "0 0 0.25rem 0",
    fontSize: "0.9375rem",
    fontWeight: "500",
  },
  itemDescription: {
    margin: "0 0 0.5rem 0",
    fontSize: "0.8125rem",
    color: "#666",
  },
  itemFooter: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  itemCategory: {
    fontSize: "0.6875rem",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "0.125rem 0.375rem",
    borderRadius: "4px",
    textTransform: "capitalize",
  },
  itemStatus: {
    fontSize: "0.6875rem",
    padding: "0.125rem 0.375rem",
    borderRadius: "4px",
    textTransform: "capitalize",
  },
  memberSince: {
    textAlign: "center",
    color: "#888",
    fontSize: "0.875rem",
  },
};
