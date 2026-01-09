"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS } from "@/lib/validation";
import type { ItemCategory } from "@frontporch/shared";

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "tools", label: "Tools" },
  { value: "kitchen", label: "Kitchen" },
  { value: "outdoor", label: "Outdoor" },
  { value: "sports", label: "Sports" },
  { value: "games", label: "Games" },
  { value: "electronics", label: "Electronics" },
  { value: "books", label: "Books" },
  { value: "baby", label: "Baby" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

export default function NewItemPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ItemCategory>("other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }

      // Get neighborhood ID
      const { data: neighborhood } = await supabase
        .from("neighborhoods")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!neighborhood) {
        setError("Neighborhood not found");
        return;
      }

      // Verify membership
      const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("neighborhood_id", neighborhood.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!membership) {
        setError("You must be a member to add items");
        return;
      }

      // Create item
      const { error: insertError } = await supabase.from("items").insert({
        neighborhood_id: neighborhood.id,
        owner_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category,
        photo_urls: [],
        availability: "available",
      });

      if (insertError) {
        logger.error("Insert error", insertError);
        setError(insertError.message);
        return;
      }

      router.push(`/neighborhoods/${slug}/library`);
      router.refresh();
    } catch (err) {
      logger.error("Error adding item", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <Link href={`/neighborhoods/${slug}/library`} style={styles.backLink}>
        &larr; Back to Library
      </Link>

      <div style={styles.card}>
        <h1 style={styles.title}>Add Item to Library</h1>
        <p style={styles.subtitle}>
          Share something with your neighbors that they can borrow
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label htmlFor="name" style={styles.label}>
              Item Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Circular Saw, Dutch Oven, Camping Tent"
              required
              maxLength={MAX_LENGTHS.itemName}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="category" style={styles.label}>
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ItemCategory)}
              required
              style={styles.select}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label htmlFor="description" style={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the item, condition, or any borrowing notes..."
              rows={4}
              maxLength={MAX_LENGTHS.itemDescription}
              style={styles.textarea}
            />
            {description.length > MAX_LENGTHS.itemDescription * 0.8 && (
              <span style={styles.charCount}>
                {description.length}/{MAX_LENGTHS.itemDescription}
              </span>
            )}
          </div>

          <div style={styles.actions}>
            <Link
              href={`/neighborhoods/${slug}/library`}
              style={styles.cancelButton}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              style={styles.submitButton}
            >
              {loading ? "Adding..." : "Add Item"}
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
    padding: "1rem",
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
    margin: "0 0 0.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0 0 1.5rem 0",
    color: "#666",
    fontSize: "0.875rem",
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
  select: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    backgroundColor: "white",
  },
  textarea: {
    padding: "0.75rem 1rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    resize: "vertical",
    fontFamily: "inherit",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "flex-end",
    marginTop: "0.5rem",
  },
  cancelButton: {
    padding: "0.75rem 1.5rem",
    color: "#666",
    textDecoration: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
  },
  submitButton: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  charCount: {
    fontSize: "0.75rem",
    color: "#888",
    textAlign: "right",
  },
};
