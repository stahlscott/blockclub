import { notFound } from "next/navigation";
import Link from "next/link";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  getCategoryEmoji,
  getCategoryColorLight,
} from "@/lib/category-utils";
import { BorrowButton } from "./borrow-button";
import { OwnerActions } from "./owner-actions";
import { AdminActions } from "./admin-actions";
import responsive from "@/app/responsive.module.css";
import styles from "./item-detail.module.css";

function getInitial(name: string | null | undefined): string {
  if (!name) return "?";
  const stripped = name.replace(/^the\s+/i, "");
  return stripped.charAt(0)?.toUpperCase() || "?";
}

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ItemDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const { user, neighborhood, isStaffAdmin, isNeighborhoodAdmin, supabase } =
    await getNeighborhoodAccess(slug);

  // Fetch item with owner
  // Note: Use FK hint for ambiguous relationship (items has multiple user FKs)
  const { data: item } = await supabase
    .from("items")
    .select("*, owner:users!items_owner_id_fkey(id, name, avatar_url, phone)")
    .eq("id", id)
    .eq("neighborhood_id", neighborhood.id)
    .single();

  if (!item) {
    notFound();
  }

  const isOwner = item.owner_id === user.id;
  const isAdmin = isNeighborhoodAdmin || isStaffAdmin;

  // Admin can remove items they don't own
  const canRemoveItem = isAdmin && !isOwner;

  // Fetch active loan for this item
  // Note: Use FK hint for ambiguous relationship (loans has multiple user FKs)
  const { data: activeLoan } = await supabase
    .from("loans")
    .select("*, borrower:users!loans_borrower_id_fkey(id, name)")
    .eq("item_id", id)
    .in("status", ["requested", "approved", "active"])
    .single();

  // Check if current user has a pending request
  const { data: userRequest } = await supabase
    .from("loans")
    .select("*")
    .eq("item_id", id)
    .eq("borrower_id", user.id)
    .in("status", ["requested", "approved", "active"])
    .single();

  return (
    <div className={styles.pageContainer}>
      <Link href={`/neighborhoods/${slug}/library`} className={styles.backLink}>
        &larr; Back to Library
      </Link>

      <div className={responsive.detailGrid}>
        <div className={styles.imageSection}>
          <OptimizedImage
            src={item.photo_urls?.[0]}
            alt={item.name}
            width={400}
            height={300}
            className={styles.image}
            borderRadius="var(--radius-lg)"
            priority
            fallback={
              <div
                className={styles.imagePlaceholder}
                style={{
                  background: `linear-gradient(180deg, ${getCategoryColorLight(item.category)} 0%, var(--color-surface) 50%)`,
                }}
              >
                <div className={styles.placeholderCircle}>
                  <span className={styles.placeholderIcon}>
                    {getCategoryEmoji(item.category)}
                  </span>
                </div>
                <div className={styles.placeholderTitle}>No Photo Added</div>
                <div className={styles.placeholderSubtext}>
                  Photos help neighbors know what to borrow
                </div>
                {isOwner && (
                  <Link
                    href={`/neighborhoods/${slug}/library/${item.id}/edit`}
                    className={styles.placeholderButton}
                  >
                    Add Photo
                  </Link>
                )}
              </div>
            }
          />
        </div>

        <div className={styles.details}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>{item.name}</h1>
            <span
              className={`${styles.availabilityTag} ${
                item.availability === "available"
                  ? styles.availableTag
                  : item.availability === "borrowed"
                    ? styles.borrowedTag
                    : styles.unavailableTag
              }`}
            >
              {item.availability}
            </span>
          </div>

          <span className={styles.categoryTag}>{item.category}</span>

          {item.description && (
            <p className={styles.description}>{item.description}</p>
          )}

          <div className={styles.ownerSection}>
            <h3 className={styles.sectionTitle}>Owner</h3>
            <Link
              href={`/neighborhoods/${slug}/members/${item.owner?.id}`}
              className={styles.ownerCard}
            >
              <div className={styles.avatar}>
                <OptimizedImage
                  src={item.owner?.avatar_url}
                  alt={item.owner?.name || "Owner"}
                  width={48}
                  height={48}
                  className={styles.avatarImage}
                  borderRadius="50%"
                  fallback={<span>{getInitial(item.owner?.name)}</span>}
                />
              </div>
              <div>
                <p className={styles.ownerName}>{item.owner?.name}</p>
                {isOwner && <span className={styles.youTag}>You</span>}
              </div>
            </Link>
          </div>

          {/* Show info when someone else has this item */}
          {activeLoan && !isOwner && activeLoan.borrower_id !== user.id && (
            <div className={styles.loanInfo}>
              <p>
                This item is currently{" "}
                {activeLoan.status === "active"
                  ? "borrowed by another member"
                  : "reserved"}
                .
              </p>
            </div>
          )}

          {/* Actions based on role */}
          {isOwner ? (
            <OwnerActions item={item} slug={slug} activeLoan={activeLoan} />
          ) : (
            <BorrowButton
              itemId={id}
              slug={slug}
              isAvailable={item.availability === "available"}
              userLoan={userRequest}
            />
          )}

          {/* Admin actions for non-owners */}
          {canRemoveItem && (
            <AdminActions itemId={id} itemName={item.name} slug={slug} />
          )}
        </div>
      </div>
    </div>
  );
}
