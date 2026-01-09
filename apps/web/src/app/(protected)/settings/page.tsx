"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

      if (profile?.primary_neighborhood_id) {
        // Get slug from primary neighborhood
        const { data: neighborhood } = await supabase
          .from("neighborhoods")
          .select("slug")
          .eq("id", profile.primary_neighborhood_id)
          .single();
        neighborhoodSlug = neighborhood?.slug || null;
      }

      // Fall back to first active membership if no primary set
      if (!neighborhoodSlug) {
        const { data: memberships } = await supabase
          .from("memberships")
          .select("neighborhood:neighborhoods(slug)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1);

        if (memberships?.[0]?.neighborhood) {
          neighborhoodSlug = (memberships[0].neighborhood as any).slug;
        }
      }

      setSlug(neighborhoodSlug);
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
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Link href="/dashboard" style={styles.backLink}>
        &larr; Back to Dashboard
      </Link>

      <div style={styles.card}>
        <h1 style={styles.title}>Settings</h1>

        {slug ? (
          <>
            <h2 style={styles.sectionTitle}>Invite Link</h2>
            <div style={styles.inviteSection}>
              <p style={styles.inviteHint}>
                Share this link to invite neighbors to join:
              </p>
              <div style={styles.inviteRow}>
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${slug}`}
                  style={styles.inviteInput}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  style={styles.copyButton}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p style={styles.noNeighborhood}>
            Join a neighborhood to get an invite link.
          </p>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Change Password</h2>

        <form onSubmit={handlePasswordChange} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="newPassword" style={styles.label}>
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              placeholder="At least 6 characters"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Re-enter new password"
            />
          </div>

          {passwordError && <p style={styles.error}>{passwordError}</p>}
          {passwordSuccess && (
            <p style={styles.success}>Password changed successfully!</p>
          )}

          <button type="submit" disabled={changingPassword} style={styles.button}>
            {changingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1rem",
  },
  card: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  title: {
    margin: "0 0 1.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  sectionTitle: {
    margin: "0 0 0.75rem 0",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#333",
  },
  inviteSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  inviteHint: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#666",
  },
  inviteRow: {
    display: "flex",
    gap: "0.5rem",
  },
  inviteInput: {
    flex: 1,
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "0.875rem",
    backgroundColor: "#f9fafb",
    color: "#333",
  },
  copyButton: {
    padding: "0.75rem 1.25rem",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  noNeighborhood: {
    color: "#666",
    fontSize: "0.875rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
  },
  button: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    margin: 0,
  },
  success: {
    color: "#059669",
    fontSize: "0.875rem",
    margin: 0,
  },
};
