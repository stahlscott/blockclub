import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isStaffAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getActiveMembershipForUser,
  getNeighborhoodBySlug,
  getPendingMembersByNeighborhood,
} from "@/lib/queries";
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
  const { data: neighborhood } = await getNeighborhoodBySlug(supabase, slug);

  if (!neighborhood) {
    notFound();
  }

  // Check if user is admin (neighborhood admin or staff admin)
  const { data: membership } = await getActiveMembershipForUser(supabase, neighborhood.id, user.id);

  const isNeighborhoodAdmin = membership?.role === "admin";
  const userIsStaffAdmin = await isStaffAdminUser(createAdminClient(), user.id);

  if (!isNeighborhoodAdmin && !userIsStaffAdmin) {
    redirect("/dashboard");
  }

  // Fetch pending memberships
  const { data: pendingMembers } = await getPendingMembersByNeighborhood(supabase, neighborhood.id);

  return (
    <div className={pendingStyles.container}>
      <div className={pendingStyles.header}>
        <Link href="/dashboard" className={pendingStyles.backButton}>
          <ArrowLeft className={pendingStyles.backButtonIcon} />
          Dashboard
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
                <MembershipActions membershipId={member.id} neighborhoodSlug={slug} />
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
