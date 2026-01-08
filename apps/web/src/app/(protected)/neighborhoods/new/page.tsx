"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureUserProfile } from "@/lib/ensure-profile";

export default function NewNeighborhoodPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [requireApproval, setRequireApproval] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to create a neighborhood");
      setLoading(false);
      return;
    }

    const slug = generateSlug(name);

    // Ensure user profile exists
    const { success, error: profileError } = await ensureUserProfile(supabase, user);
    if (!success) {
      setError(profileError || "Failed to create user profile. Please try again.");
      setLoading(false);
      return;
    }

    // Check if slug is already taken
    const { data: existing } = await supabase
      .from("neighborhoods")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      setError("A neighborhood with this name already exists. Please choose a different name.");
      setLoading(false);
      return;
    }

    // Create the neighborhood
    const { data: neighborhood, error: createError } = await supabase
      .from("neighborhoods")
      .insert({
        name,
        slug,
        description: description || null,
        location: location || null,
        settings: {
          require_approval: requireApproval,
          allow_public_directory: false,
        },
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from("memberships")
      .insert({
        user_id: user.id,
        neighborhood_id: neighborhood.id,
        role: "admin",
        status: "active",
      });

    if (memberError) {
      console.error("Error creating membership:", memberError);
      // Don't block - neighborhood was created
    }

    router.push(`/neighborhoods/${slug}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link href="/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </Link>
        
        <h1 style={styles.title}>Create a Neighborhood</h1>
        <p style={styles.subtitle}>
          Start a community for your neighbors to connect and share.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="name" style={styles.label}>
              Neighborhood Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={styles.input}
              placeholder="e.g., Maplewood Heights"
            />
            {name && (
              <span style={styles.slug}>
                URL: /neighborhoods/{generateSlug(name)}
              </span>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="description" style={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              placeholder="Tell potential members about your neighborhood..."
              rows={3}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="location" style={styles.label}>
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={styles.input}
              placeholder="e.g., Downtown Portland"
            />
          </div>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                style={styles.checkbox}
              />
              <span>Require approval for new members</span>
            </label>
            <span style={styles.hint}>
              When enabled, you&apos;ll need to approve each person who wants to join.
            </span>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating..." : "Create Neighborhood"}
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
    margin: "0 0 0.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0 0 1.5rem 0",
    color: "#666",
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
  textarea: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    resize: "vertical" as const,
    fontFamily: "inherit",
  },
  slug: {
    fontSize: "0.75rem",
    color: "#888",
    marginTop: "0.25rem",
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  checkbox: {
    width: "1rem",
    height: "1rem",
  },
  hint: {
    fontSize: "0.75rem",
    color: "#888",
    marginLeft: "1.5rem",
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
};
