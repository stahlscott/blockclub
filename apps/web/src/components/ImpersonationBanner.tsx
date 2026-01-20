"use client";

/**
 * Floating banner shown when staff admin is impersonating a user.
 * Provides quick access to:
 * - See who you're impersonating
 * - Exit impersonation
 * - Access staff admin panel
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { stopImpersonation } from "@/app/actions/impersonation";
import styles from "./ImpersonationBanner.module.css";

interface ImpersonationBannerProps {
  impersonatedUser: {
    id: string;
    name: string | null;
    email: string;
  };
}

export function ImpersonationBanner({ impersonatedUser }: ImpersonationBannerProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleExit = async () => {
    setIsPending(true);
    const result = await stopImpersonation();
    if (result.success) {
      router.push("/staff");
    } else {
      setIsPending(false);
    }
  };

  const displayName = impersonatedUser.name || impersonatedUser.email;

  return (
    <div className={styles.banner} data-testid="impersonation-banner">
      <div className={styles.content}>
        <div className={styles.userInfo}>
          <span className={styles.label}>Viewing as:</span>
          <span className={styles.userName}>{displayName}</span>
        </div>
        <div className={styles.actions}>
          <Link href="/staff" className={styles.staffLink} data-testid="impersonation-staff-link">
            Staff Panel
          </Link>
          <button
            onClick={handleExit}
            disabled={isPending}
            className={`${styles.exitButton} compact`}
            data-testid="impersonation-exit-button"
          >
            {isPending ? "Exiting..." : "Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}
