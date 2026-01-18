import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdmin } from "@/lib/auth";
import { MembershipActions } from "./membership-actions";
import pendingStyles from "./pending.module.css";

function getInitial(name: string | null | undefined, fallback?: string): string {
  if (!name) return fallback?.charAt(0)?.toUpperCase() || "?";
  const stripped = name.replace(/^the\s+/i, "");
  return stripped.charAt(0)?.toUpperCase() || "?";
}

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

  // Check if user is admin (neighborhood admin or staff admin)
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const isNeighborhoodAdmin = membership?.role === "admin";
  const userIsStaffAdmin = isStaffAdmin(user.email);

  if (!isNeighborhoodAdmin && !userIsStaffAdmin) {
    redirect("/dashboard");
  }

  // Fetch pending memberships
  // Note: Use FK hint for ambiguous relationship (memberships has multiple user FKs)
  const { data: pendingMembers } = await supabase
    .from("memberships")
    .select("*, user:users!memberships_user_id_fkey(id, name, email, avatar_url, address)")
    .eq("neighborhood_id", neighborhood.id)
    .eq("status", "pending")
    .order("joined_at", { ascending: true });

  return (
    <div className={pendingStyles.container}>
      <div className={pendingStyles.header}>
        <Link href="/dashboard" className={pendingStyles.backLink}>
          &larr; Dashboard
        </Link>
        <h1 className={pendingStyles.title}>Pending Requests</h1>
        <p className={pendingStyles.subtitle}>
          {pendingMembers?.length || 0} households waiting to join
        </p>
      </div>

      {pendingMembers && pendingMembers.length > 0 ? (
        <div className={pendingStyles.list}>
          {pendingMembers.map((member: any) => {
            const userName = member.user?.name;
            const userEmail = member.user?.email;
            const hasProfile = !!member.user;
            const initial = getInitial(userName, userEmail);

            return (
              <div key={member.id} className={pendingStyles.card}>
                <div className={pendingStyles.memberInfo}>
                  <div className={pendingStyles.avatar}>
                    {member.user?.avatar_url ? (
                      <Image
                        src={member.user.avatar_url}
                        alt={userName || "User"}
                        width={48}
                        height={48}
                        className={pendingStyles.avatarImage}
                      />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>
                  <div className={pendingStyles.details}>
                    {hasProfile ? (
                      <>
                        <h3 className={pendingStyles.name}>
                          {userName || (
                            <span className={pendingStyles.noName}>No name set</span>
                          )}
                        </h3>
                        {member.user?.address && (
                          <p className={pendingStyles.address}>{member.user.address}</p>
                        )}
                        <p className={pendingStyles.email}>{userEmail}</p>
                      </>
                    ) : (
                      <>
                        <h3 className={pendingStyles.name}>
                          <span className={pendingStyles.noName}>Profile not found</span>
                        </h3>
                        <p className={pendingStyles.userId}>
                          User ID: {member.user_id.slice(0, 8)}...
                        </p>
                      </>
                    )}
                    <p className={pendingStyles.date}>
                      Requested{" "}
                      {new Date(member.joined_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <MembershipActions membershipId={member.id} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className={pendingStyles.empty}>
          <p className={pendingStyles.emptyText}>No pending requests</p>
          <Link
            href={`/neighborhoods/${slug}/directory`}
            className={pendingStyles.emptyLink}
          >
            View current members
          </Link>
        </div>
      )}
    </div>
  );
}
