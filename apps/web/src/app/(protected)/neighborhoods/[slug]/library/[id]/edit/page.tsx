"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { MAX_LENGTHS } from "@/lib/validation";
import { ITEM_CATEGORIES } from "@/lib/category-utils";
import { ItemPhotoUpload } from "@/components/ItemPhotoUpload";
import type { ItemCategory } from "@blockclub/shared";
import styles from "../../library-forms.module.css";

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ItemCategory>("other");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadItem() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const { data: item, error: fetchError } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !item) {
        setError("Item not found");
        setLoading(false);
        return;
      }

      if (item.owner_id !== user.id) {
        setError("You can only edit your own items");
        setLoading(false);
        return;
      }

      setName(item.name);
      setDescription(item.description || "");
      setCategory(item.category as ItemCategory);
      setPhotoUrls(item.photo_urls || []);
      setUserId(user.id);
      setLoading(false);
    }

    loadItem();
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("items")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category,
          photo_urls: photoUrls,
        })
        .eq("id", id);

      if (updateError) {
        logger.error("Update error", updateError, { itemId: id });
        setError(updateError.message);
        return;
      }

      router.push(`/neighborhoods/${slug}/library/${id}`);
      router.refresh();
    } catch (err) {
      logger.error("Error updating item", err, { itemId: id });
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link
        href={`/neighborhoods/${slug}/library/${id}`}
        className={styles.backButton}
      >
        <ArrowLeft className={styles.backButtonIcon} />
        Back to Item
      </Link>

      <h1 className={styles.pageTitle}>Edit Item</h1>

      <form onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

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
                required
                maxLength={MAX_LENGTHS.itemName}
                className={styles.input}
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
                placeholder="Add details about the item..."
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
          </div>
        </div>

        <div className={styles.actions}>
          <Link
            href={`/neighborhoods/${slug}/library/${id}`}
            className={styles.cancelButton}
          >
            Cancel
          </Link>
          <button type="submit" disabled={saving} className={styles.submitButton}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
