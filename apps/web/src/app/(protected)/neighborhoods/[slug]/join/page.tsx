"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

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
      const { data: neighborhoodData } = await supabase
        .from("neighborhoods")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!neighborhoodData) {
        router.push("/dashboard");
        return;
      }

      setNeighborhood(neighborhoodData);

      // Check for existing membership
      const { data: membershipData } = await supabase
        .from("memberships")
        .select("*")
        .eq("neighborhood_id", neighborhoodData.id)
        .eq("user_id", user.id)
        .single();

      if (membershipData) {
        setExistingMembership(membershipData);
      }

      setLoading(false);
    }

    loadData();
  }, [slug, router]);

  const handleJoinRequest = async () => {
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setSubmitting(false);
      return;
    }

    // Ensure user profile exists (might not if email confirmation happened on different device)
    const { data: existingProfile } = await supabase
      .from("users")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      // Create the user profile
      const { error: profileError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email!,
        name:
          user.user_metadata?.name || user.email?.split("@")[0] || "New User",
        avatar_url: null,
        bio: null,
        phone: null,
      });

      if (profileError) {
        logger.error("Error creating profile", profileError);
        setError("Failed to create your profile. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    const requiresApproval = neighborhood.settings?.require_approval !== false;

    const { error: joinError } = await supabase.from("memberships").insert({
      user_id: user.id,
      neighborhood_id: neighborhood.id,
      role: "member",
      status: requiresApproval ? "pending" : "active",
    });

    if (joinError) {
      setError(joinError.message);
      setSubmitting(false);
      return;
    }

    if (requiresApproval) {
      setSuccess(true);
    } else {
      router.push(`/neighborhoods/${slug}`);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (existingMembership) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>{neighborhood.name}</h1>

          {existingMembership.status === "active" ? (
            <>
              <p style={styles.message}>
                You&apos;re already a member of this neighborhood!
              </p>
              <Link href="/dashboard" style={styles.primaryButton}>
                Go to Dashboard
              </Link>
            </>
          ) : existingMembership.status === "pending" ? (
            <>
              <div style={styles.pendingBadge}>Pending Approval</div>
              <p style={styles.message}>
                Your request to join this neighborhood is pending approval from
                an admin.
              </p>
              <Link href="/dashboard" style={styles.secondaryButton}>
                Back to Dashboard
              </Link>
            </>
          ) : (
            <>
              <p style={styles.message}>
                Your membership status is: {existingMembership.status}
              </p>
              <Link href="/dashboard" style={styles.secondaryButton}>
                Back to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>Request Sent!</h1>
          <p style={styles.message}>
            Your request to join <strong>{neighborhood.name}</strong> has been
            sent. An admin will review your request and you&apos;ll be notified
            when approved.
          </p>
          <Link href="/dashboard" style={styles.primaryButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <Link href="/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </Link>

        <h1 style={styles.title}>Join {neighborhood.name}</h1>

        {neighborhood.description && (
          <p style={styles.description}>{neighborhood.description}</p>
        )}

        {neighborhood.location && (
          <p style={styles.location}>{neighborhood.location}</p>
        )}

        <div style={styles.infoBox}>
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

        {error && <p style={styles.error}>{error}</p>}

        <button
          onClick={handleJoinRequest}
          disabled={submitting}
          style={styles.primaryButton}
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

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "500px",
    margin: "0 auto",
    padding: "1rem",
  },
  card: {
    backgroundColor: "white",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  backLink: {
    color: "#666",
    textDecoration: "none",
    fontSize: "0.875rem",
    display: "inline-block",
    marginBottom: "1rem",
    textAlign: "left",
    width: "100%",
  },
  title: {
    margin: "0 0 1rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  description: {
    color: "#444",
    marginBottom: "0.5rem",
  },
  location: {
    color: "#666",
    fontSize: "0.875rem",
    marginBottom: "1.5rem",
  },
  infoBox: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "6px",
    padding: "1rem",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    color: "#0369a1",
  },
  primaryButton: {
    display: "inline-block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.75rem 2rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
  },
  secondaryButton: {
    display: "inline-block",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    padding: "0.75rem 2rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "500",
  },
  message: {
    color: "#444",
    marginBottom: "1.5rem",
  },
  pendingBadge: {
    display: "inline-block",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "0.5rem 1rem",
    borderRadius: "9999px",
    fontSize: "0.875rem",
    fontWeight: "500",
    marginBottom: "1rem",
  },
  successIcon: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    fontSize: "2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
};
