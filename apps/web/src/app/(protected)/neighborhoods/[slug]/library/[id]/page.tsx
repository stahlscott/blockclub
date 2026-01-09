import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { BorrowButton } from "./borrow-button";
import { OwnerActions } from "./owner-actions";
import { AdminActions } from "./admin-actions";
import responsive from "@/app/responsive.module.css";

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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  // Fetch neighborhood
  const { data: neighborhood } = await supabase
    .from("neighborhoods")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!neighborhood) {
    notFound();
  }

  // Check membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("*")
    .eq("neighborhood_id", neighborhood.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    redirect(`/neighborhoods/${slug}`);
  }

  // Fetch item with owner
  const { data: item } = await supabase
    .from("items")
    .select("*, owner:users(id, name, avatar_url, phone)")
    .eq("id", id)
    .eq("neighborhood_id", neighborhood.id)
    .single();

  if (!item) {
    notFound();
  }

  const isOwner = item.owner_id === user.id;
  const userIsSuperAdmin = isSuperAdmin(user.email);
  const isNeighborhoodAdmin = membership.role === "admin";
  const isAdmin = isNeighborhoodAdmin || userIsSuperAdmin;

  // Admin can remove items they don't own
  const canRemoveItem = isAdmin && !isOwner;

  // Fetch active loan for this item
  const { data: activeLoan } = await supabase
    .from("loans")
    .select("*, borrower:users(id, name)")
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
    <div style={styles.container}>
      <Link href={`/neighborhoods/${slug}/library`} style={styles.backLink}>
        &larr; Back to Library
      </Link>

      <div className={responsive.detailGrid}>
        <div style={styles.imageSection}>
          {item.photo_urls && item.photo_urls.length > 0 ? (
            <Image
              src={item.photo_urls[0]}
              alt={item.name}
              width={400}
              height={300}
              style={styles.image}
              priority
            />
          ) : (
            <div style={styles.imagePlaceholder}>
              <span style={styles.placeholderIcon}>📦</span>
            </div>
          )}
        </div>

        <div style={styles.details}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>{item.name}</h1>
            <span
              style={{
                ...styles.availabilityTag,
                ...(item.availability === "available"
                  ? styles.availableTag
                  : item.availability === "borrowed"
                    ? styles.borrowedTag
                    : styles.unavailableTag),
              }}
            >
              {item.availability}
            </span>
          </div>

          <span style={styles.categoryTag}>{item.category}</span>

          {item.description && (
            <p style={styles.description}>{item.description}</p>
          )}

          <div style={styles.ownerSection}>
            <h3 style={styles.sectionTitle}>Owner</h3>
            <Link
              href={`/neighborhoods/${slug}/members/${item.owner?.id}`}
              style={styles.ownerCard}
            >
              <div style={styles.avatar}>
                {item.owner?.avatar_url ? (
                  <Image
                    src={item.owner.avatar_url}
                    alt={item.owner.name || "Owner"}
                    width={48}
                    height={48}
                    style={styles.avatarImage}
                  />
                ) : (
                  <span>{getInitial(item.owner?.name)}</span>
                )}
              </div>
              <div>
                <p style={styles.ownerName}>{item.owner?.name}</p>
                {isOwner && <span style={styles.youTag}>You</span>}
              </div>
            </Link>
          </div>

          {/* Show info when someone else has this item */}
          {activeLoan && !isOwner && activeLoan.borrower_id !== user.id && (
            <div style={styles.loanInfo}>
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

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "1.5rem 1rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1rem",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  imageSection: {
    backgroundColor: "#f5f5f5",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    minHeight: "300px",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    minHeight: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  placeholderIcon: {
    fontSize: "4rem",
  },
  details: {
    padding: "2rem",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.75rem",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  availabilityTag: {
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  availableTag: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  borrowedTag: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  unavailableTag: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  categoryTag: {
    display: "inline-block",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    padding: "0.25rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    textTransform: "capitalize",
    marginBottom: "1rem",
  },
  description: {
    color: "#444",
    lineHeight: "1.6",
    marginBottom: "1.5rem",
  },
  ownerSection: {
    marginBottom: "1.5rem",
  },
  sectionTitle: {
    margin: "0 0 0.75rem 0",
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  ownerCard: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    textDecoration: "none",
    color: "inherit",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    color: "#3730a3",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  ownerName: {
    margin: 0,
    fontWeight: "500",
  },
  youTag: {
    fontSize: "0.75rem",
    color: "#666",
  },
  loanInfo: {
    padding: "1rem",
    backgroundColor: "#f0f9ff",
    borderRadius: "6px",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    color: "#0369a1",
  },
};
