"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureUserProfile } from "@/lib/ensure-profile";
import { MAX_LENGTHS } from "@/lib/validation";
import styles from "./new-neighborhood.module.css";

export function NewNeighborhoodForm() {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to create a neighborhood");
      setLoading(false);
      return;
    }

    const slug = generateSlug(name);

    // Ensure user profile exists
    const { success, error: profileError } = await ensureUserProfile(
      supabase,
      user,
    );
    if (!success) {
      setError(
        profileError || "Failed to create user profile. Please try again.",
      );
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
      setError(
        "A neighborhood with this name already exists. Please choose a different name.",
      );
      setLoading(false);
      return;
    }

    // Create the neighborhood
    const { error: createError } = await supabase
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

    // Neighborhood created with 0 members
    // The first user to join will become admin via database trigger
    router.push("/staff");
    router.refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Link href="/staff" className={styles.backLink}>
          &larr; Back to Staff Panel
        </Link>

        <h1 className={styles.title}>Create a Neighborhood</h1>
        <p className={styles.subtitle}>
          Start a community for your neighbors to connect and share.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>
              Neighborhood Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={MAX_LENGTHS.neighborhoodName}
              className={styles.input}
              placeholder="e.g., Detroit Ave"
            />
            {name.length > MAX_LENGTHS.neighborhoodName * 0.8 && (
              <span className={styles.charCount}>
                {name.length}/{MAX_LENGTHS.neighborhoodName}
              </span>
            )}
            {name && (
              <span className={styles.slug}>
                URL: /neighborhoods/{generateSlug(name)}
              </span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_LENGTHS.neighborhoodDescription}
              className={styles.textarea}
              placeholder="Tell potential members about your neighborhood..."
              rows={3}
            />
            {description.length > MAX_LENGTHS.neighborhoodDescription * 0.8 && (
              <span className={styles.charCount}>
                {description.length}/{MAX_LENGTHS.neighborhoodDescription}
              </span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="location" className={styles.label}>
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={MAX_LENGTHS.neighborhoodLocation}
              className={styles.input}
              placeholder="e.g., Northwest"
            />
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className={styles.checkbox}
              />
              <span>Require approval for new members</span>
            </label>
            <span className={styles.hint}>
              When enabled, you&apos;ll need to approve each person who wants to
              join.
            </span>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Creating..." : "Create Neighborhood"}
          </button>
        </form>
      </div>
    </div>
  );
}
