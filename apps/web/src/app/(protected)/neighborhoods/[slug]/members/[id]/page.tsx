import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { RoleActions } from "./role-actions";
import { MoveOutActions } from "./move-out-actions";
import profileStyles from "./member-profile.module.css";

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  const stripped = name.replace(/^the\s+/i, "");
  return stripped.charAt(0)?.toUpperCase() || "?";
}

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
  const userIsStaffAdmin = isStaffAdmin(user.email);
  const isNeighborhoodAdmin = currentMembership.role === "admin";
  const isAdmin = isNeighborhoodAdmin || userIsStaffAdmin;

  // Determine role change permissions
  // Can promote: staff admin or neighborhood admin (if target is member)
  // Can demote: staff admin only (if target is admin)
  const canPromote =
    (userIsStaffAdmin || isNeighborhoodAdmin) &&
    membership.role === "member" &&
    !isOwnProfile;
  const canDemote =
    userIsStaffAdmin && membership.role === "admin" && !isOwnProfile;

  // Admins can mark any active member as moved out (except themselves)
  const canMarkMovedOut =
    (userIsStaffAdmin || isNeighborhoodAdmin) && !isOwnProfile;

  return (
    <div className={profileStyles.container}>
      <Link href={`/neighborhoods/${slug}/directory`} className={profileStyles.backLink}>
        &larr; Back to Directory
      </Link>

      <div className={profileStyles.profileHeader}>
        <div className={profileStyles.avatar}>
          {member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt={member.name}
              width={100}
              height={100}
              className={profileStyles.avatarImg}
            />
          ) : (
            <span className={profileStyles.avatarInitial}>
              {getInitial(member.name)}
            </span>
          )}
        </div>

        <div className={profileStyles.profileInfo}>
          <h1 className={profileStyles.name}>
            {member.name}
            {membership.role === "admin" && (
              <span className={profileStyles.adminBadge}>Admin</span>
            )}
          </h1>

          {member.address && (
            <p className={profileStyles.address}>
              {member.address}
              {member.unit && `, ${member.unit}`}
              {member.move_in_year && (
                <span className={profileStyles.moveInYear}>
                  {" "}
                  - Since {member.move_in_year}
                </span>
              )}
            </p>
          )}

          {member.bio && <p className={profileStyles.bio}>{member.bio}</p>}

          {isOwnProfile && (
            <Link href="/profile" className={profileStyles.editButton}>
              Edit Profile
            </Link>
          )}
        </div>
      </div>

      {(member.children || member.pets) && (
        <div className={profileStyles.familySection}>
          <h2 className={profileStyles.sectionTitle}>Family & Pets</h2>
          <div className={profileStyles.familyGrid}>
            {member.children && (
              <div className={profileStyles.familyCard}>
                <span className={profileStyles.familyIcon}>👶</span>
                <div className={profileStyles.familyContent}>
                  <span className={profileStyles.familyLabel}>Children</span>
                  <span className={profileStyles.familyValue}>{member.children}</span>
                </div>
              </div>
            )}
            {member.pets && (
              <div className={profileStyles.familyCard}>
                <span className={profileStyles.familyIcon}>🐾</span>
                <div className={profileStyles.familyContent}>
                  <span className={profileStyles.familyLabel}>Pets</span>
                  <span className={profileStyles.familyValue}>{member.pets}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={profileStyles.contactSection}>
        <h2 className={profileStyles.sectionTitle}>Contact</h2>
        <div className={profileStyles.contactGrid}>
          {/* Show phones first, in the order they appear on the profile */}
          {member.phones && member.phones.length > 0
            ? member.phones.map(
                  (phone: { label: string; number: string }, index: number) => (
                    <div key={index} className={profileStyles.phoneCard}>
                      <span className={profileStyles.contactIcon}>📱</span>
                      <span className={profileStyles.contactLabel}>
                        {phone.label || "Phone"}
                      </span>
                      <span className={profileStyles.phoneNumber}>
                        {phone.number.replace(
                          /(\d{3})(\d{3})(\d{4})/,
                          "($1) $2-$3",
                        )}
                      </span>
                      <div className={profileStyles.phoneActions}>
                        <a href={`tel:${phone.number}`} className={profileStyles.phoneActionButton}>
                          Call
                        </a>
                        <a href={`sms:${phone.number}`} className={profileStyles.phoneActionButton}>
                          Text
                        </a>
                      </div>
                    </div>
                  ),
                )
            : member.phone && (
                <div className={profileStyles.phoneCard}>
                  <span className={profileStyles.contactIcon}>📱</span>
                  <span className={profileStyles.contactLabel}>Phone</span>
                  <span className={profileStyles.phoneNumber}>{member.phone}</span>
                  <div className={profileStyles.phoneActions}>
                    <a href={`tel:${member.phone}`} className={profileStyles.phoneActionButton}>
                      Call
                    </a>
                    <a href={`sms:${member.phone}`} className={profileStyles.phoneActionButton}>
                      Text
                    </a>
                  </div>
                </div>
              )}
          {/* Emails shown after phones */}
          {member.emails && member.emails.length > 0 &&
            member.emails.map(
              (emailEntry: { label: string; email: string }, index: number) => (
                <div key={`email-${index}`} className={profileStyles.phoneCard}>
                  <span className={profileStyles.contactIcon}>📧</span>
                  <span className={profileStyles.contactLabel}>
                    {emailEntry.label || "Email"}
                  </span>
                  <a href={`mailto:${emailEntry.email}`} className={profileStyles.contactLink}>
                    {emailEntry.email}
                  </a>
                </div>
              ),
            )}
        </div>
      </div>

      {items && items.length > 0 && (
        <div className={profileStyles.itemsSection}>
          <h2 className={profileStyles.sectionTitle}>
            {isOwnProfile
              ? "Your Items"
              : "Items"}
          </h2>
          <div className={profileStyles.itemGrid}>
            {items.map((item: any) => (
              <Link
                key={item.id}
                href={`/neighborhoods/${slug}/library/${item.id}`}
                className={profileStyles.itemCard}
              >
                <h3 className={profileStyles.itemName}>{item.name}</h3>
                {item.description && (
                  <p className={profileStyles.itemDescription}>
                    {item.description.length > 60
                      ? `${item.description.substring(0, 60)}...`
                      : item.description}
                  </p>
                )}
                <div className={profileStyles.itemFooter}>
                  <span className={profileStyles.itemCategory}>{item.category}</span>
                  <span
                    className={`${profileStyles.itemStatus} ${
                      item.availability === "available"
                        ? profileStyles.itemStatusAvailable
                        : profileStyles.itemStatusUnavailable
                    }`}
                  >
                    {item.availability}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={profileStyles.memberSince}>
        Member since{" "}
        {new Date(membership.joined_at).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </div>

      {!isOwnProfile && (canPromote || canDemote || canMarkMovedOut) && (
        <div className={profileStyles.adminActionsSection}>
          <div className={profileStyles.adminActionsRow}>
            {(canPromote || canDemote) && (
              <RoleActions
                membershipId={membership.id}
                currentRole={membership.role}
                canPromote={canPromote}
                canDemote={canDemote}
                memberName={member.name}
              />
            )}
            {canMarkMovedOut && (
              <MoveOutActions
                membershipId={membership.id}
                slug={slug}
                canMarkMovedOut={canMarkMovedOut}
                memberName={member.name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
