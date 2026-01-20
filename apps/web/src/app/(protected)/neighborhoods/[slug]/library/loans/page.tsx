import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getNeighborhoodAccess } from "@/lib/neighborhood-access";
import styles from "../library-pages.module.css";
import libraryStyles from "../library.module.css";
import { LibraryTabs } from "../library-tabs";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MyLoansPage({ params }: Props) {
  const { slug } = await params;
  const { user, supabase } = await getNeighborhoodAccess(slug);

  // Fetch loans where user is borrower
  // Note: Use FK hints for ambiguous relationships
  const { data: borrowedLoans } = await supabase
    .from("loans")
    .select("*, item:items!loans_item_id_fkey(id, name, photo_urls, owner:users!items_owner_id_fkey(id, name))")
    .eq("borrower_id", user.id)
    .order("requested_at", { ascending: false });

  // Filter to only items from this neighborhood
  const neighborhoodLoans =
    borrowedLoans?.filter((loan: any) => loan.item?.owner) || [];

  // Group by status
  const activeLoans = neighborhoodLoans.filter(
    (l: any) => l.status === "active" || l.status === "approved",
  );
  const pendingLoans = neighborhoodLoans.filter(
    (l: any) => l.status === "requested",
  );
  const pastLoans = neighborhoodLoans.filter(
    (l: any) => l.status === "returned" || l.status === "cancelled",
  );

  return (
    <div className={libraryStyles.container}>
      <div className={libraryStyles.topRow}>
        <Link href="/dashboard" className={libraryStyles.backButton}>
          <ArrowLeft className={libraryStyles.backButtonIcon} />
          Dashboard
        </Link>
        <Link
          href={`/neighborhoods/${slug}/library/new`}
          className={libraryStyles.addButton}
          data-testid="library-mine-add-item-button"
        >
          + Add Item
        </Link>
      </div>
      <div className={libraryStyles.headerRow}>
        <div>
          <h1 className={libraryStyles.title}>Lending Library</h1>
          <p className={libraryStyles.subtitle}>
            Items you&apos;re borrowing or have borrowed
          </p>
        </div>
      </div>

      <LibraryTabs slug={slug} />

      {activeLoans.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Currently Borrowing</h2>
          <div className={styles.list}>
            {activeLoans.map((loan: any) => (
              <LoanCard key={loan.id} loan={loan} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {pendingLoans.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pending Requests</h2>
          <div className={styles.list}>
            {pendingLoans.map((loan: any) => (
              <LoanCard key={loan.id} loan={loan} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {pastLoans.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Past Loans</h2>
          <div className={styles.list}>
            {pastLoans.map((loan: any) => (
              <LoanCard key={loan.id} loan={loan} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {neighborhoodLoans.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            You haven&apos;t borrowed any items yet.
          </p>
          <Link
            href={`/neighborhoods/${slug}/library`}
            className={styles.emptyButton}
          >
            Browse the Library
          </Link>
        </div>
      )}
    </div>
  );
}

function LoanCard({ loan, slug }: { loan: any; slug: string }) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "requested":
        return styles.statusRequested;
      case "approved":
        return styles.statusApproved;
      case "active":
        return styles.statusActive;
      case "returned":
        return styles.statusReturned;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return "";
    }
  };

  return (
    <Link
      href={`/neighborhoods/${slug}/library/${loan.item?.id}`}
      className={styles.card}
    >
      <div className={styles.cardImageContainer}>
        {loan.item?.photo_urls && loan.item.photo_urls.length > 0 ? (
          <Image
            src={loan.item.photo_urls[0]}
            alt={loan.item.name}
            width={64}
            height={64}
            className={styles.cardImage}
          />
        ) : (
          <div className={styles.cardImagePlaceholder}>
            <span>📦</span>
          </div>
        )}
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{loan.item?.name || "Unknown Item"}</h3>
        <p className={styles.cardOwner}>
          from {loan.item?.owner?.name || "Unknown"}
        </p>
        <div className={styles.cardMeta}>
          <span className={`${styles.statusBadge} ${getStatusClass(loan.status)}`}>
            {loan.status}
          </span>
          {loan.due_date && loan.status === "active" && (
            <span className={styles.dueDate}>
              Due: {new Date(loan.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className={styles.chevron}>&rarr;</div>
    </Link>
  );
}
