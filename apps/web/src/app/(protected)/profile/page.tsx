"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    name: "",
    bio: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/signin");
        return;
      }

      setUser(authUser);

      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profileData) {
        setProfile({
          name: profileData.name || "",
          bio: profileData.bio || "",
          phone: profileData.phone || "",
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("users")
      .update({
        name: profile.name,
        bio: profile.bio || null,
        phone: profile.phone || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      router.refresh(); // Refresh server data so other pages show updated profile
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
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
      <div style={styles.card}>
        <Link href="/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </Link>

        <h1 style={styles.title}>Edit Profile</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              style={{ ...styles.input, ...styles.inputDisabled }}
            />
            <span style={styles.hint}>
              Email cannot be changed
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="name" style={styles.label}>
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
              style={styles.input}
              placeholder="Your name"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="phone" style={styles.label}>
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              style={styles.input}
              placeholder="555-123-4567"
            />
            <span style={styles.hint}>
              Visible to members of your neighborhoods
            </span>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="bio" style={styles.label}>
              About You
            </label>
            <textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              style={styles.textarea}
              placeholder="Tell your neighbors a bit about yourself..."
              rows={4}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>Profile updated successfully!</p>}

          <button type="submit" disabled={saving} style={styles.button}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "500px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
  card: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1.5rem",
  },
  title: {
    margin: "0 0 1.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
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
  inputDisabled: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    cursor: "not-allowed",
  },
  textarea: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    resize: "vertical" as const,
    fontFamily: "inherit",
  },
  hint: {
    fontSize: "0.75rem",
    color: "#888",
    marginTop: "0.25rem",
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
