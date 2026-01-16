"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [neighborhoodName, setNeighborhoodName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Leave neighborhood state
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      // Fetch user profile to get primary neighborhood
      const { data: profile } = await supabase
        .from("users")
        .select("primary_neighborhood_id")
        .eq("id", user.id)
        .single();

      let neighborhoodSlug: string | null = null;
      let activeMembershipId: string | null = null;
      let activeMembershipNeighborhoodName: string | null = null;

      if (profile?.primary_neighborhood_id) {
        // Get slug from primary neighborhood and membership
        const { data: neighborhood } = await supabase
          .from("neighborhoods")
          .select("slug, name")
          .eq("id", profile.primary_neighborhood_id)
          .single();
        neighborhoodSlug = neighborhood?.slug || null;
        activeMembershipNeighborhoodName = neighborhood?.name || null;

        // Get the membership ID for this neighborhood
        const { data: membership } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", user.id)
          .eq("neighborhood_id", profile.primary_neighborhood_id)
          .eq("status", "active")
          .single();
        activeMembershipId = membership?.id || null;
      }

      // Fall back to first active membership if no primary set
      if (!neighborhoodSlug) {
        const { data: memberships } = await supabase
          .from("memberships")
          .select("id, neighborhood:neighborhoods(slug, name)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1);

        if (memberships?.[0]?.neighborhood) {
          neighborhoodSlug = (memberships[0].neighborhood as any).slug;
          activeMembershipNeighborhoodName = (memberships[0].neighborhood as any).name;
          activeMembershipId = memberships[0].id;
        }
      }

      setSlug(neighborhoodSlug);
      setMembershipId(activeMembershipId);
      setNeighborhoodName(activeMembershipNeighborhoodName);
      setLoading(false);
    }

    loadData();
  }, [router]);

  const handleCopy = () => {
    if (!slug) return;
    const url = `${window.location.origin}/join/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/dashboard" className={styles.backLink}>
        &larr; Back to Dashboard
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>Settings</h1>

        {slug ? (
          <>
            <h2 className={styles.sectionTitle}>Invite Link</h2>
            <div className={styles.inviteSection}>
              <p className={styles.inviteHint}>
                Share this link to invite neighbors to join:
              </p>
              <div className={styles.inviteRow}>
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${slug}`}
                  className={styles.inviteInput}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={styles.copyButton}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className={styles.leaveSection}>
              {leaveError && <p className={styles.error}>{leaveError}</p>}
              <button
                type="button"
                onClick={handleLeaveNeighborhood}
                disabled={leaving}
                className={styles.leaveButton}
              >
                {leaving ? "Leaving..." : "Leave Neighborhood"}
              </button>
            </div>
          </>
        ) : (
          <p className={styles.noNeighborhood}>
            Join a neighborhood to get an invite link.
          </p>
        )}
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Change Password</h2>

        <form onSubmit={handlePasswordChange} className={styles.form}>
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
            />
          </div>

          {passwordError && <p className={styles.error}>{passwordError}</p>}
          {passwordSuccess && (
            <p className={styles.success}>Password changed successfully!</p>
          )}

          <button type="submit" disabled={changingPassword} className={styles.button}>
            {changingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
