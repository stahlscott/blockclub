import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MyLoansPage({ params }: Props) {
  const { slug } = await params;
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

  // Fetch loans where user is borrower
  const { data: borrowedLoans } = await supabase
    .from("loans")
    .select("*, item:items(id, name, photo_urls, owner:users(id, name))")
    .eq("borrower_id", user.id)
    .order("requested_at", { ascending: false });

  // Filter to only items from this neighborhood
  const neighborhoodLoans = borrowedLoans?.filter(
    (loan: any) => loan.item?.owner
  ) || [];

  // Group by status
  const activeLoans = neighborhoodLoans.filter(
    (l: any) => l.status === "active" || l.status === "approved"
  );
  const pendingLoans = neighborhoodLoans.filter(
    (l: any) => l.status === "requested"
  );
  const pastLoans = neighborhoodLoans.filter(
    (l: any) => l.status === "returned" || l.status === "cancelled"
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href={`/neighborhoods/${slug}/library`} style={styles.backLink}>
          &larr; Back to Library
        </Link>
        <h1 style={styles.title}>My Loans</h1>
        <p style={styles.subtitle}>
          Items you&apos;re borrowing or have borrowed
        </p>
      </div>

      {activeLoans.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Currently Borrowing</h2>
          <div style={styles.list}>
            {activeLoans.map((loan: any) => (
              <LoanCard key={loan.id} loan={loan} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {pendingLoans.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Pending Requests</h2>
          <div style={styles.list}>
            {pendingLoans.map((loan: any) => (
              <LoanCard key={loan.id} loan={loan} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {pastLoans.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Past Loans</h2>
          <div style={styles.list}>
            {pastLoans.map((loan: any) => (
              <LoanCard key={loan.id} loan={loan} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {neighborhoodLoans.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>
            You haven&apos;t borrowed any items yet.
          </p>
          <Link href={`/neighborhoods/${slug}/library`} style={styles.emptyButton}>
            Browse the Library
          </Link>
        </div>
      )}
    </div>
  );
}

function LoanCard({ loan, slug }: { loan: any; slug: string }) {
  const statusColors: Record<string, React.CSSProperties> = {
    requested: { backgroundColor: "#fef3c7", color: "#92400e" },
    approved: { backgroundColor: "#dbeafe", color: "#1e40af" },
    active: { backgroundColor: "#dcfce7", color: "#166534" },
    returned: { backgroundColor: "#f3f4f6", color: "#6b7280" },
    cancelled: { backgroundColor: "#fee2e2", color: "#991b1b" },
  };

  return (
    <Link
      href={`/neighborhoods/${slug}/library/${loan.item?.id}`}
      style={styles.card}
    >
      <div style={styles.cardImageContainer}>
        {loan.item?.photo_urls && loan.item.photo_urls.length > 0 ? (
          <img
            src={loan.item.photo_urls[0]}
            alt={loan.item.name}
            style={styles.cardImage}
          />
        ) : (
          <div style={styles.cardImagePlaceholder}>
            <span>📦</span>
          </div>
        )}
      </div>
      <div style={styles.cardContent}>
        <h3 style={styles.cardTitle}>{loan.item?.name || "Unknown Item"}</h3>
        <p style={styles.cardOwner}>
          from {loan.item?.owner?.name || "Unknown"}
        </p>
        <div style={styles.cardMeta}>
          <span style={{ ...styles.statusBadge, ...statusColors[loan.status] }}>
            {loan.status}
          </span>
          {loan.due_date && loan.status === "active" && (
            <span style={styles.dueDate}>
              Due: {new Date(loan.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div style={styles.chevron}>&rarr;</div>
    </Link>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  header: {
    marginBottom: "2rem",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "0.5rem",
  },
  title: {
    margin: "0",
    fontSize: "1.75rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0.25rem 0 0 0",
    color: "#666",
    fontSize: "0.875rem",
  },
  section: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    margin: "0 0 1rem 0",
    fontSize: "1rem",
    fontWeight: "600",
    color: "#666",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textDecoration: "none",
    color: "inherit",
  },
  cardImageContainer: {
    width: "56px",
    height: "56px",
    borderRadius: "6px",
    overflow: "hidden",
    flexShrink: 0,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.25rem",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: "500",
  },
  cardOwner: {
    margin: "0.125rem 0 0.5rem 0",
    fontSize: "0.875rem",
    color: "#666",
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  statusBadge: {
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  dueDate: {
    fontSize: "0.75rem",
    color: "#666",
  },
  chevron: {
    color: "#999",
    fontSize: "1.25rem",
  },
  empty: {
    textAlign: "center",
    padding: "3rem 1rem",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  emptyText: {
    color: "#666",
    marginBottom: "1rem",
  },
  emptyButton: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 1.5rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
  },
};
