"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS } from "@/lib/validation";
import styles from "@/app/(protected)/settings/settings.module.css";

export default function NeighborhoodSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [neighborhood, setNeighborhood] = useState<any>(null);
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    require_approval: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);

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

      // Check if user is admin (neighborhood admin or staff admin)
      const { data: membership } = await supabase
        .from("memberships")
        .select("*")
        .eq("neighborhood_id", neighborhoodData.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      const isNeighborhoodAdmin = membership?.role === "admin";

      // Fetch staff admin status via API (env var not available on client)
      let userIsStaffAdmin = false;
      try {
        const staffResponse = await fetch("/api/auth/staff-status");
        const staffData = await staffResponse.json();
        userIsStaffAdmin = staffData.isStaffAdmin;
      } catch {
        userIsStaffAdmin = false;
      }

      if (!isNeighborhoodAdmin && !userIsStaffAdmin) {
        router.push("/dashboard");
        return;
      }

      setIsStaffAdmin(userIsStaffAdmin);
      setNeighborhood(neighborhoodData);
      setNewSlug(neighborhoodData.slug);
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
      // Staff admins use the admin API to bypass RLS
      if (isStaffAdmin) {
        const response = await fetch(`/api/admin/neighborhoods/${neighborhood.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            location: form.location.trim() || null,
            settings: { require_approval: form.require_approval },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to save changes");
          return;
        }
      } else {
        // Regular neighborhood admins use direct Supabase update
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
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      logger.error("Error saving", err, { slug });
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleSlugUpdate() {
    if (!newSlug.trim() || newSlug === slug) return;

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(newSlug)) {
      setSlugError("Slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    setSavingSlug(true);
    setSlugError("");

    try {
      const response = await fetch(`/api/admin/neighborhoods/${neighborhood.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSlugError(data.error || "Failed to update slug");
        return;
      }

      // Redirect to new slug URL
      router.push(`/neighborhoods/${newSlug}/settings`);
    } catch (err) {
      logger.error("Error updating slug", err, { slug });
      setSlugError("Something went wrong");
    } finally {
      setSavingSlug(false);
    }
  }

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
        <h1 className={styles.title}>Neighborhood Admin</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>Settings saved!</div>}

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Neighborhood Name *
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={MAX_LENGTHS.neighborhoodName}
              className={styles.input}
            />
            <span className={styles.hint}>
              Display name only. The URL will remain /{slug}.
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="location" className={styles.label}>
              Location
            </label>
            <input
              id="location"
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Northwest"
              maxLength={MAX_LENGTHS.neighborhoodLocation}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Tell people about your neighborhood..."
              rows={4}
              maxLength={MAX_LENGTHS.neighborhoodDescription}
              className={styles.textarea}
            />
            {form.description.length >
              MAX_LENGTHS.neighborhoodDescription * 0.8 && (
              <span className={styles.charCount}>
                {form.description.length}/{MAX_LENGTHS.neighborhoodDescription}
              </span>
            )}
          </div>

          <div className={styles.divider} />

          <h2 className={styles.sectionTitle}>Membership</h2>

          <div className={styles.checkboxField}>
            <input
              id="require_approval"
              type="checkbox"
              checked={form.require_approval}
              onChange={(e) =>
                setForm({ ...form, require_approval: e.target.checked })
              }
              className={styles.checkbox}
            />
            <label htmlFor="require_approval" className={styles.checkboxLabel}>
              <span className={styles.checkboxTitle}>Require admin approval</span>
              <span className={styles.checkboxHint}>
                New members must be approved by an admin before joining
              </span>
            </label>
          </div>

          <div className={styles.divider} />

          <h2 className={styles.sectionTitle}>Admin Actions</h2>

          <Link
            href={`/neighborhoods/${slug}/members/pending`}
            className={styles.adminLink}
          >
            Review pending requests
          </Link>

          <div className={styles.actions}>
            <button type="submit" disabled={saving} className={styles.submitButton}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Staff Admin Section - only visible to staff admins */}
      {isStaffAdmin && (
        <div className={styles.card}>
          <h1 className={styles.title}>Staff Admin</h1>

          <div className={styles.field}>
            <label htmlFor="slug" className={styles.label}>
              URL Slug
            </label>
            <div className={styles.inviteRow}>
              <input
                id="slug"
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
                className={styles.input}
                style={{ flex: 1 }}
                pattern="[a-z0-9-]+"
              />
              <button
                type="button"
                onClick={handleSlugUpdate}
                disabled={savingSlug || !newSlug.trim() || newSlug === slug}
                className={styles.copyButton}
              >
                {savingSlug ? "Saving..." : "Update"}
              </button>
            </div>
            <span className={styles.hint}>
              Changing the slug will update all URLs for this neighborhood.
            </span>
            {slugError && (
              <div className={styles.error} style={{ marginTop: "var(--space-2)" }}>
                {slugError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
