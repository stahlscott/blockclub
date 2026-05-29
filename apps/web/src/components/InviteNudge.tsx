"use client";

import { useInvite } from "@/lib/hooks/useInvite";
import styles from "./InviteNudge.module.css";

type NudgeSection = "library" | "posts" | "directory";

const NUDGE_COPY: Record<NudgeSection, string> = {
  library: "Your neighbors might have things to share too \u2014 invite them to Block Club",
  posts: "A livelier board starts with more neighbors",
  directory: "The more neighbors who join, the more useful Block Club becomes",
};

interface InviteNudgeProps {
  slug: string;
  section: NudgeSection;
}

export function InviteNudge({ slug, section }: InviteNudgeProps) {
  const { handleInvite, modal } = useInvite(slug);

  return (
    <>
      <div className={styles.nudge} data-testid={`invite-nudge-${section}`}>
        <p className={styles.text}>{NUDGE_COPY[section]}</p>
        <button
          onClick={handleInvite}
          className={styles.button}
          type="button"
          data-testid={`invite-nudge-${section}-button`}
        >
          Share Invite
        </button>
      </div>
      {modal}
    </>
  );
}
