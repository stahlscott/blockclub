"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MAX_LENGTHS } from "@/lib/validation";
import { ItemPhotoUpload } from "@/components/ItemPhotoUpload";
import { createItem } from "../actions";
import type { ItemCategory } from "@blockclub/shared";
import styles from "../library-forms.module.css";

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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Load user ID on mount for photo uploads
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    loadUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createItem({
        slug,
        name,
        description: description || null,
        category,
        photoUrls,
      });

      if (result.success) {
        router.push(`/neighborhoods/${slug}/library`);
        router.refresh();
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className={styles.container}>
      <Link href={`/neighborhoods/${slug}/library`} className={styles.backLink}>
        &larr; Back to Library
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>Add Item to Library</h1>
        <p className={styles.subtitle}>
          Share something with your neighbors that they can borrow
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
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
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="category" className={styles.label}>
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ItemCategory)}
              required
              className={styles.select}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the item, condition, or any borrowing notes..."
              rows={4}
              maxLength={MAX_LENGTHS.itemDescription}
              className={styles.textarea}
            />
            {description.length > MAX_LENGTHS.itemDescription * 0.8 && (
              <span className={styles.charCount}>
                {description.length}/{MAX_LENGTHS.itemDescription}
              </span>
            )}
          </div>

          {userId && (
            <ItemPhotoUpload
              userId={userId}
              photos={photoUrls}
              onPhotosChange={setPhotoUrls}
              onError={setError}
            />
          )}

          <div className={styles.actions}>
            <Link
              href={`/neighborhoods/${slug}/library`}
              className={styles.cancelButton}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className={styles.submitButton}
            >
              {isPending ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
