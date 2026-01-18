"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import styles from "./settings.module.css";

interface SettingsClientProps {
  initialMembershipId: string | null;
  initialNeighborhoodName: string | null;
  isImpersonating: boolean;
}

export function SettingsClient({
  initialMembershipId,
  initialNeighborhoodName,
  isImpersonating,
}: SettingsClientProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [membershipId] = useState<string | null>(initialMembershipId);
  const [neighborhoodName] = useState<string | null>(initialNeighborhoodName);

  // Leave neighborhood state
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const handleLeaveNeighborhood = async () => {
    if (!membershipId) return;

    const confirmed = window.confirm(
      `Are you sure you want to leave ${neighborhoodName || "this neighborhood"}? You will need an invitation to return!`
    );

    if (!confirmed) return;

    setLeaving(true);
    setLeaveError(null);

    try {
      const response = await fetch(`/api/memberships/${membershipId}/move-out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave neighborhood");
      }

      router.push("/dashboard");
    } catch (err) {
      setLeaveError(err instanceof Error ? err.message : "An error occurred");
      setLeaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError(updateError.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }

    setChangingPassword(false);
  };

  return (
    <div className={styles.container}>
      <Link href="/dashboard" className={styles.backLink}>
        &larr; Back to Dashboard
      </Link>

      <h1 className={styles.title}>Account Settings</h1>

      {isImpersonating && (
        <div className={styles.card}>
          <p className={styles.impersonationNotice}>
            Some settings are disabled while viewing as another user.
          </p>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <p className={styles.signOutHint}>
          Control how you receive notifications about your lending library activity.
        </p>
        <Link
          href="/settings/notifications"
          className={styles.adminLink}
          data-testid="settings-notifications-link"
        >
          Manage notification preferences &rarr;
        </Link>
      </div>

      {!isImpersonating && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Change Password</h2>

          <form onSubmit={handlePasswordChange} className={styles.form} data-testid="settings-password-form">
            <div className={styles.inputGroup}>
              <label htmlFor="newPassword" className={styles.label}>
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className={styles.input}
                placeholder="At least 6 characters"
                data-testid="settings-new-password-input"
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={styles.input}
                placeholder="Re-enter new password"
                data-testid="settings-confirm-password-input"
              />
            </div>

            {passwordError && <p className={styles.error} data-testid="settings-password-error">{passwordError}</p>}
            {passwordSuccess && (
              <p className={styles.success} data-testid="settings-password-success">Password changed successfully!</p>
            )}

            <button type="submit" disabled={changingPassword} className={styles.button} data-testid="settings-change-password-button">
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>
      )}

      {!isImpersonating && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Sign Out</h2>
          <p className={styles.signOutHint}>
            Sign out of your account on this device.
          </p>
          <button type="button" onClick={signOut} className={styles.signOutButton} data-testid="settings-signout-button">
            Sign Out
          </button>
        </div>
      )}

      {!isImpersonating && membershipId && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Leave Neighborhood</h2>
          <p className={styles.signOutHint}>
            Leave {neighborhoodName || "your neighborhood"}. You will need an invitation to return.
          </p>
          {leaveError && <p className={styles.error}>{leaveError}</p>}
          <button
            type="button"
            onClick={handleLeaveNeighborhood}
            disabled={leaving}
            className={styles.leaveButton}
            data-testid="settings-leave-neighborhood-button"
          >
            {leaving ? "Leaving..." : `Leave ${neighborhoodName || "Neighborhood"}`}
          </button>
        </div>
      )}
    </div>
  );
}
