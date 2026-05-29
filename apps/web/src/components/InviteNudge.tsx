"use client";

import { useInvite } from "@/lib/hooks/useInvite";
import styles from "./InviteNudge.module.css";

type NudgeSection = "library" | "posts" | "directory";

const NUDGE_COPY: Record<NudgeSection, string> = {
  library: "Know someone who\u2019d lend their tools? Share Block Club with them",
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
