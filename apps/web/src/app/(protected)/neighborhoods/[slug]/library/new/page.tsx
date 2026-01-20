"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAX_LENGTHS } from "@/lib/validation";
import { ITEM_CATEGORIES } from "@/lib/category-utils";
import { ItemPhotoUpload } from "@/components/ItemPhotoUpload";
import { createItem } from "../actions";
import type { ItemCategory } from "@blockclub/shared";
import styles from "../library-forms.module.css";

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(() => {
      createItem({
        slug,
        name,
        description: description || null,
        category,
        photoUrls,
      }).then((result) => {
        if (result.success) {
          router.push(`/neighborhoods/${slug}/library`);
          router.refresh();
        } else {
          setError(result.error || "Something went wrong. Please try again.");
        }
      });
    });
  }

  return (
    <div className={styles.container}>
      <Link href={`/neighborhoods/${slug}/library`} className={styles.backButton}>
        <ArrowLeft className={styles.backButtonIcon} />
        Back to Library
      </Link>

      <h1 className={styles.pageTitle}>Add Item to Library</h1>
      <p className={styles.pageSubtitle}>
        Share something with your neighbors that they can borrow
      </p>

      <form onSubmit={handleSubmit} data-testid="library-new-item-form">
        {error && <div className={styles.error} data-testid="library-new-item-form-error">{error}</div>}

        <div className={styles.card}>
          <div className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                Item Name <span className={styles.required}>*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., circular saw, kayak, board games"
                required
                maxLength={MAX_LENGTHS.itemName}
                className={styles.input}
                data-testid="library-new-item-name-input"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="category" className={styles.label}>
                Category <span className={styles.required}>*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                required
                className={styles.select}
                data-testid="library-new-item-category-select"
              >
                {ITEM_CATEGORIES.map((cat) => (
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
                data-testid="library-new-item-description-input"
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
          </div>
        </div>

        <div className={styles.actions}>
          <Link
            href={`/neighborhoods/${slug}/library`}
            className={styles.cancelButton}
            data-testid="library-new-item-cancel-button"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className={styles.submitButton}
            data-testid="library-new-item-submit-button"
          >
            {isPending ? "Adding..." : "Add Item"}
          </button>
        </div>
      </form>
    </div>
  );
}
