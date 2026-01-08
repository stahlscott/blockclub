"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSuperAdmin } from "@/lib/auth";

export default function NeighborhoodSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [neighborhood, setNeighborhood] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    require_approval: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

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

      // Fetch neighborhood
      const { data: neighborhoodData } = await supabase
        .from("neighborhoods")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!neighborhoodData) {
        router.push("/dashboard");
        return;
      }

      // Check if user is admin (neighborhood admin or super admin)
      const { data: membership } = await supabase
        .from("memberships")
        .select("*")
        .eq("neighborhood_id", neighborhoodData.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      const isNeighborhoodAdmin = membership?.role === "admin";
      const userIsSuperAdmin = isSuperAdmin(user.email);

      if (!isNeighborhoodAdmin && !userIsSuperAdmin) {
        router.push(`/neighborhoods/${slug}`);
        return;
      }

      setNeighborhood(neighborhoodData);
      setForm({
        name: neighborhoodData.name,
        description: neighborhoodData.description || "",
        location: neighborhoodData.location || "",
        require_approval: neighborhoodData.settings?.require_approval !== false,
      });
      setLoading(false);
    }

    loadData();
  }, [slug, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("neighborhoods")
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          settings: {
            ...neighborhood.settings,
            require_approval: form.require_approval,
          },
        })
        .eq("id", neighborhood.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving:", err);
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

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
      <Link href={`/neighborhoods/${slug}`} style={styles.backLink}>
        &larr; Back to {neighborhood.name}
      </Link>

      <div style={styles.card}>
        <h1 style={styles.title}>Neighborhood Settings</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>Settings saved!</div>}

          <div style={styles.field}>
            <label htmlFor="name" style={styles.label}>
              Neighborhood Name *
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="location" style={styles.label}>
              Location
            </label>
            <input
              id="location"
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Austin, TX"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="description" style={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell people about your neighborhood..."
              rows={4}
              style={styles.textarea}
            />
          </div>

          <div style={styles.divider} />

          <h2 style={styles.sectionTitle}>Membership</h2>

          <div style={styles.checkboxField}>
            <input
              id="require_approval"
              type="checkbox"
              checked={form.require_approval}
              onChange={(e) =>
                setForm({ ...form, require_approval: e.target.checked })
              }
              style={styles.checkbox}
            />
            <label htmlFor="require_approval" style={styles.checkboxLabel}>
              <span style={styles.checkboxTitle}>Require admin approval</span>
              <span style={styles.checkboxHint}>
                New members must be approved by an admin before joining
              </span>
            </label>
          </div>

          <div style={styles.divider} />

          <h2 style={styles.sectionTitle}>Invite Link</h2>
          
          <div style={styles.inviteSection}>
            <p style={styles.inviteHint}>
              Share this link to invite neighbors to join:
            </p>
            <div style={styles.inviteRow}>
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}/join/${slug}` : `/join/${slug}`}
                style={styles.inviteInput}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${slug}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={styles.copyButton}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div style={styles.divider} />

          <h2 style={styles.sectionTitle}>Admin Actions</h2>

          <Link href={`/neighborhoods/${slug}/members/pending`} style={styles.adminLink}>
            Review pending requests
          </Link>

          <div style={styles.actions}>
            <button type="submit" disabled={saving} style={styles.submitButton}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "2rem 1rem",
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
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
  error: {
    padding: "0.75rem 1rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  success: {
    padding: "0.75rem 1rem",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
    color: "#333",
  },
  input: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
  },
  textarea: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    resize: "vertical",
    fontFamily: "inherit",
  },
  divider: {
    height: "1px",
    backgroundColor: "#eee",
    margin: "0.5rem 0",
  },
  sectionTitle: {
    margin: "0",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#333",
  },
  checkboxField: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-start",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    marginTop: "2px",
  },
  checkboxLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  checkboxTitle: {
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  checkboxHint: {
    fontSize: "0.75rem",
    color: "#666",
  },
  adminLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "0.875rem",
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
  actions: {
    marginTop: "0.5rem",
  },
  submitButton: {
    width: "100%",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
  },
};
