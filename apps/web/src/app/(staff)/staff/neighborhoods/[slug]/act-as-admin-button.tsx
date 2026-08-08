"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startImpersonation } from "@/app/actions/impersonation";
import styles from "./detail.module.css";

interface ActAsAdminButtonProps {
  adminUserId: string | null;
}

export function ActAsAdminButton({ adminUserId }: ActAsAdminButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!adminUserId) return;

    setLoading(true);
    setError(null);
    const result = await startImpersonation(adminUserId, "/dashboard");
    if (result.success && result.redirectTo) {
      router.push(result.redirectTo);
    } else {
      setError(result.error || "Failed to impersonate admin");
      setLoading(false);
    }
  };

  return (
    <>
    {error && <p className={styles.actionError} role="alert">{error}</p>}
    <button
      className={styles.actAsAdminButton}
      onClick={handleClick}
      disabled={!adminUserId || loading}
      title={!adminUserId ? "No admin found for this neighborhood" : undefined}
      data-testid="act-as-admin-button"
    >
      {loading ? "..." : "Act as Admin"}
    </button>
    </>
  );
}
