"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import styles from "./settings.module.css";

interface SettingsClientProps {
  initialMembershipId: string | null;
  initialNeighborhoodName: string | null;
  isImpersonating: boolean;
  userEmail: string;
}

export function SettingsClient({
  initialMembershipId,
  initialNeighborhoodName,
  isImpersonating,
  userEmail,
}: SettingsClientProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [membershipId] = useState<string | null>(initialMembershipId);
  const [neighborhoodName] = useState<string | null>(initialNeighborhoodName);
  const [currentEmail] = useState(userEmail);

  // Leave neighborhood state
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Email change state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);

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
      setPasswordError("Password must be at least 8 characters");
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

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);

    if (!newEmail.trim()) {
      setEmailError("Please enter an email address");
      return;
    }

    if (newEmail === currentEmail) {
      setEmailError("New email is the same as current email");
      return;
    }

    setChangingEmail(true);

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (updateError) {
      setEmailError(updateError.message);
    } else {
      setEmailSuccess(true);
      setShowChangeEmail(false);
      setNewEmail("");
      // Note: The email won't actually change until they click the confirmation link
      // sent to the new address, so we don't update currentEmail here
    }

    setChangingEmail(false);
  };

  return (
    <div className={styles.container}>
      <Link href="/dashboard" className={styles.backButton}>
        <ArrowLeft className={styles.backButtonIcon} />
        Dashboard
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
        <div className={styles.card} data-testid="settings-email-section">
          <h2 className={styles.sectionTitle}>Email Address</h2>
          <p className={styles.emailDisplay}>
            Your current email: <span className={styles.emailValue} data-testid="settings-current-email">{currentEmail}</span>
          </p>

          {emailSuccess && (
            <p className={styles.success} data-testid="settings-email-success">
              Check your new email address for a confirmation link.
            </p>
          )}

          {!showChangeEmail ? (
            <button
              type="button"
              onClick={() => {
                setShowChangeEmail(true);
                setNewEmail(currentEmail);
                setEmailSuccess(false);
              }}
              className={styles.changeEmailButton}
              data-testid="settings-change-email-button"
            >
              Change email address
            </button>
          ) : (
            <form onSubmit={handleEmailChange} className={styles.changeEmailForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="newEmailInput" className={styles.label}>
                  New email address
                </label>
                <input
                  id="newEmailInput"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className={styles.input}
                  placeholder="new@email.com"
                  data-testid="settings-new-email-input"
                />
              </div>
              {emailError && (
                <p className={styles.error} data-testid="settings-email-error">
                  {emailError}
                </p>
              )}
              <div className={styles.buttonRow}>
                <button
                  type="submit"
                  disabled={changingEmail}
                  className={styles.button}
                  data-testid="settings-update-email-button"
                >
                  {changingEmail ? "Updating..." : "Update email"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeEmail(false);
                    setNewEmail("");
                    setEmailError(null);
                  }}
                  className={styles.secondaryButton}
                  data-testid="settings-cancel-email-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

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
                placeholder="At least 8 characters"
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
