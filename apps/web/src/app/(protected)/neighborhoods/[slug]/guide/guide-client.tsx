"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Pencil } from "lucide-react";
import { RichTextContent } from "@/components/RichTextEditor";
import { saveGuide } from "./actions";
import { formatDate } from "@/lib/date-utils";
import type { NeighborhoodGuideWithUpdatedBy } from "@blockclub/shared";
import styles from "./guide.module.css";

// Lazy load the editor since only admins use it
const RichTextEditor = dynamic(
  () => import("@/components/RichTextEditor").then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div style={{ padding: "2rem", textAlign: "center" }}>Loading editor...</div> }
);

interface GuideClientProps {
  guide: NeighborhoodGuideWithUpdatedBy | null;
  neighborhoodId: string;
  neighborhoodName: string;
  isAdmin: boolean;
  currentUserId: string;
  slug: string;
}

export function GuideClient({
  guide,
  neighborhoodId,
  neighborhoodName,
  isAdmin,
  currentUserId,
}: GuideClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(guide?.title || "Neighborhood Notes");
  const [content, setContent] = useState(guide?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasContent = guide && guide.content.trim() !== "";

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const result = await saveGuide({
      neighborhoodId,
      title: title.trim() || "Neighborhood Notes",
      content,
      userId: currentUserId,
    });

    setIsSaving(false);

    if (result.success) {
      setIsEditing(false);
    } else {
      setError(result.error || "Failed to save guide");
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setTitle(guide?.title || "Neighborhood Notes");
    setContent(guide?.content || "");
    setIsEditing(false);
    setError(null);
  };

  // Editor mode
  if (isEditing) {
    return (
      <div className={styles.editorContainer}>
        <div className={styles.editorHeader}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Guide title..."
            className={styles.titleInput}
            maxLength={100}
            data-testid="guide-title-input"
          />
        </div>

        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Share helpful info for your neighbors - garbage day, local contacts, upcoming events..."
          data-testid="guide-editor"
        />

        <div className={styles.editorActions}>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={styles.saveButton}
            disabled={isSaving}
            data-testid="guide-save-button"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }

  // Empty state (no guide yet)
  if (!hasContent) {
    return (
      <>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{guide?.title || "Neighborhood Notes"}</h1>
            <p className={styles.subtitle}>{neighborhoodName}</p>
          </div>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          {isAdmin ? (
            <>
              <h2 className={styles.emptyTitle}>Create your neighborhood guide</h2>
              <p className={styles.emptyDescription}>
                Add helpful info for your neighbors - garbage day, local contacts, upcoming events,
                or anything else people should know.
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={styles.emptyButton}
                data-testid="guide-create-button"
              >
                <Pencil className={styles.editButtonIcon} />
                Start Writing
              </button>
            </>
          ) : (
            <>
              <h2 className={styles.emptyTitle}>No guide yet</h2>
              <p className={styles.emptyDescription}>
                Your neighborhood admin hasn&apos;t added a guide yet. Check back later for helpful
                neighborhood info.
              </p>
            </>
          )}
        </div>
      </>
    );
  }

  // View mode (has content)
  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>{guide.title}</h1>
          <p className={styles.subtitle}>{neighborhoodName}</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={styles.editButton}
            data-testid="guide-edit-button"
          >
            <Pencil className={styles.editButtonIcon} />
            Edit
          </button>
        )}
      </div>

      <div className={styles.contentCard}>
        <RichTextContent
          content={guide.content}
          data-testid="guide-content"
        />

        {guide.updated_by_user && (
          <div className={styles.footer}>
            Last updated {formatDate(guide.updated_at)} by {guide.updated_by_user.name}
          </div>
        )}
      </div>
    </>
  );
}
