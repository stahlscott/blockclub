"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSuperAdmin } from "@/lib/auth";
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
      logger.error("Error saving", err, { slug });
      setError("Something went wrong");
    } finally {
      setSaving(false);
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
        <h1 className={styles.title}>Neighborhood Settings</h1>

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
              placeholder="e.g., Austin, TX"
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

          <h2 className={styles.sectionTitle}>Invite Link</h2>

          <div className={styles.inviteSection}>
            <p className={styles.inviteHint}>
              Share this link to invite neighbors to join:
            </p>
            <div className={styles.inviteRow}>
              <input
                type="text"
                readOnly
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/join/${slug}`
                    : `/join/${slug}`
                }
                className={styles.inviteInput}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/join/${slug}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={styles.copyButton}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
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
    </div>
  );
}
