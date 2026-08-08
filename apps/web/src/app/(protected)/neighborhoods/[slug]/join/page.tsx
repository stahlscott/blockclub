"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getNeighborhoodBySlug, getMembershipForUserInNeighborhood } from "@/lib/queries";
import { getSeasonalClosing } from "@/lib/date-utils";
import { requestMembership, rejoinMembership } from "@/app/join/actions";
import styles from "@/app/join/join.module.css";

export default function JoinNeighborhoodPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const [neighborhood, setNeighborhood] = useState<any>(null);
  const [existingMembership, setExistingMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      const { data: neighborhoodData } = await getNeighborhoodBySlug(supabase, slug);

      if (!neighborhoodData) {
        router.push("/dashboard");
        return;
      }

      setNeighborhood(neighborhoodData);

      // Check for existing membership
      const { data: membershipData } = await getMembershipForUserInNeighborhood(
        supabase,
        user.id,
        neighborhoodData.id,
      );

      if (membershipData) {
        setExistingMembership(membershipData);
      }

      setLoading(false);
    }

    loadData();
  }, [slug, router]);

  const handleJoinRequest = async () => {
    if (!neighborhood) return;
    setSubmitting(true);
    setError(null);
    const result = await requestMembership({ neighborhoodId: neighborhood.id });
    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    if (result.data.status === "active") router.push("/dashboard");
    else setSuccess(true);
    setSubmitting(false);
  };

  const handleRejoinRequest = async () => {
    if (!existingMembership) return;
    setSubmitting(true);
    setError(null);
    const result = await rejoinMembership({ membershipId: existingMembership.id });
    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    if (result.data.status === "active") router.push("/dashboard");
    else setSuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const membershipStatusCopy = {
    inactive: "inactive",
  } as const;

  // Handle existing membership (but not moved_out)
  if (existingMembership && existingMembership.status !== "moved_out") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>{neighborhood.name}</h1>

          {existingMembership.status === "active" ? (
            <>
              <p className={styles.message}>
                You&apos;re already a member of this neighborhood!
              </p>
              <Link href="/dashboard" className={styles.primaryButton}>
                Go to Dashboard
              </Link>
            </>
          ) : existingMembership.status === "pending" ? (
            <>
              <div className={styles.pendingBadge}>Waiting on a neighbor</div>
              <p className={styles.message}>
                Your request is in, a neighbor will let you in soon!
              </p>
              <Link href="/dashboard" className={styles.secondaryButton}>
                Back to Dashboard
              </Link>
            </>
          ) : (
            <>
              <p className={styles.message}>
                Your membership status is: {membershipStatusCopy[existingMembership.status as "inactive"] ?? "not currently active"}
              </p>
              <Link href="/dashboard" className={styles.secondaryButton}>
                Back to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // User previously moved out - can rejoin
  if (existingMembership && existingMembership.status === "moved_out") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Link href="/dashboard" className={styles.backButton}>
            <ArrowLeft className={styles.backButtonIcon} />
            Back to Dashboard
          </Link>

          <h1 className={styles.title}>Rejoin {neighborhood.name}</h1>

          {neighborhood.description && (
            <p className={styles.description}>{neighborhood.description}</p>
          )}

          <div className={styles.infoBox}>
            <p>
              You were previously a member of this neighborhood.
              {neighborhood.settings?.require_approval !== false
                ? " Your rejoin request will need admin approval."
                : " You can rejoin immediately."}
            </p>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            onClick={handleRejoinRequest}
            disabled={submitting}
            className={styles.primaryButton}
          >
            {submitting
              ? "Rejoining..."
              : neighborhood.settings?.require_approval !== false
                ? "Request to Rejoin"
                : "Rejoin Neighborhood"}
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Almost there!</h1>
          <p className={styles.message}>
            Your request to join <strong>{neighborhood.name}</strong> is in.
            A neighbor will let you in soon! {getSeasonalClosing()}
          </p>
          <Link href="/dashboard" className={styles.primaryButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Link href="/dashboard" className={styles.backButton}>
          <ArrowLeft className={styles.backButtonIcon} />
          Back to Dashboard
        </Link>

        <h1 className={styles.title}>Join {neighborhood.name}</h1>

        {neighborhood.description && (
          <p className={styles.description}>{neighborhood.description}</p>
        )}

        {neighborhood.location && (
          <p className={styles.location}>{neighborhood.location}</p>
        )}

        <div className={styles.infoBox}>
          {neighborhood.settings?.require_approval !== false ? (
            <p>
              This neighborhood requires admin approval. After you request to
              join, an admin will review and approve your membership.
            </p>
          ) : (
            <p>
              This neighborhood allows anyone to join. You&apos;ll become a
              member immediately.
            </p>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          onClick={handleJoinRequest}
          disabled={submitting}
          className={styles.primaryButton}
        >
          {submitting
            ? "Sending..."
            : neighborhood.settings?.require_approval !== false
              ? "Request to Join"
              : "Join Neighborhood"}
        </button>
      </div>
    </div>
  );
}
