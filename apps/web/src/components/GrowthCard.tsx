"use client";

import { useInvite } from "@/lib/hooks/useInvite";
import styles from "./GrowthCard.module.css";

interface Member {
  id: string;
  user?: {
    name: string | null;
    avatar_url: string | null;
  };
}

interface GrowthCardProps {
  slug: string;
  memberCount: number;
  members: Member[];
}

const AVATAR_COLORS = [
  "#C89B8C",
  "#D4A5A5",
  "#8BAAA8",
  "#E8B4B8",
  "#8B9EAA",
  "#A89B8C",
];

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  return name.replace(/^the\s+/i, "").charAt(0).toUpperCase() || "?";
}

export function GrowthCard({ slug, memberCount, members }: GrowthCardProps) {
  const { handleInvite, modal } = useInvite(slug);

  return (
    <>
      <div className={styles.card} data-testid="growth-card">
        <div className={styles.main}>
          <div className={styles.info}>
            <h2 className={styles.heading}>Invite your neighbors</h2>
            <p className={styles.subtext}>
              {memberCount} neighbor{memberCount !== 1 ? "s" : ""} ha
              {memberCount === 1 ? "s" : "ve"} joined so far
            </p>
          </div>
          <button
            onClick={handleInvite}
            className={styles.shareButton}
            type="button"
            data-testid="growth-card-share-button"
          >
            Share Invite
          </button>
        </div>
        {members.length > 0 && (
          <div className={styles.socialProof}>
            <div className={styles.avatarStack}>
              {members.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className={styles.avatar}
                  style={{ backgroundColor: getAvatarColor(member.user?.name) }}
                  title={member.user?.name || "Neighbor"}
                >
                  {member.user?.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt=""
                      className={styles.avatarImage}
                    />
                  ) : (
                    getInitial(member.user?.name)
                  )}
                </div>
              ))}
            </div>
            <span className={styles.socialProofText}>
              Your neighbors on Block Club
            </span>
          </div>
        )}
      </div>
      {modal}
    </>
  );
}
