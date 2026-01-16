"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import "@/app/globals.css";

export default function PublicJoinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [neighborhood, setNeighborhood] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [existingMembership, setExistingMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Fetch neighborhood (public query)
      const { data: neighborhoodData } = await supabase
        .from("neighborhoods")
        .select("id, name, slug, description, location, settings")
        .eq("slug", slug)
        .single();

      if (!neighborhoodData) {
        setLoading(false);
        return;
      }

      setNeighborhood(neighborhoodData);

      // Check if user is logged in
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser(authUser);

        // Check for existing membership
        const { data: membershipData } = await supabase
          .from("memberships")
          .select("*")
          .eq("neighborhood_id", neighborhoodData.id)
          .eq("user_id", authUser.id)
          .single();

        if (membershipData) {
          setExistingMembership(membershipData);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [slug]);

  const handleJoinRequest = async () => {
    if (!user || !neighborhood) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

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
        address: user.user_metadata?.address || null,
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

  const handleRejoinRequest = async () => {
    if (!user || !neighborhood || !existingMembership) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const requiresApproval = neighborhood.settings?.require_approval !== false;

    // Update existing membership status back to pending or active
    const { error: updateError } = await supabase
      .from("memberships")
      .update({
        status: requiresApproval ? "pending" : "active",
      })
      .eq("id", existingMembership.id);

    if (updateError) {
      setError(updateError.message);
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
      <div className="fullPageContainer">
        <div style={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Neighborhood not found
  if (!neighborhood) {
    return (
      <div className="fullPageContainer">
        <div style={styles.card}>
          <h1 style={styles.title}>Neighborhood Not Found</h1>
          <p style={styles.message}>
            This invite link may be invalid or the neighborhood no longer
            exists.
          </p>
          <Link href="/" style={styles.secondaryButton}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // User not logged in - show sign up / sign in options
  if (!user) {
    return (
      <div className="fullPageContainer">
        <div style={styles.card}>
          <div style={styles.inviteHeader}>
            <span style={styles.inviteIcon}>🏘️</span>
            <p style={styles.inviteText}>You&apos;ve been invited to join</p>
          </div>

          <h1 style={styles.neighborhoodName}>{neighborhood.name}</h1>

          {neighborhood.description && (
            <p style={styles.description}>{neighborhood.description}</p>
          )}

          {neighborhood.location && (
            <p style={styles.location}>{neighborhood.location}</p>
          )}

          <div style={styles.divider} />

          <p style={styles.ctaText}>
            Create an account or sign in to join this neighborhood.
          </p>

          <div style={styles.buttonGroup}>
            <Link
              href={`/signup?redirect=/join/${slug}`}
              style={styles.primaryButton}
            >
              Sign Up
            </Link>
            <Link
              href={`/signin?redirect=/join/${slug}`}
              style={styles.secondaryButton}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User is already a member
  if (existingMembership && existingMembership.status !== "moved_out") {
    return (
      <div className="fullPageContainer">
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
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <p style={styles.message}>
                Your membership status is: {existingMembership.status}
              </p>
              <Link href="/dashboard" style={styles.secondaryButton}>
                Go to Dashboard
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
      <div className="fullPageContainer">
        <div style={styles.card}>
          <div style={styles.inviteHeader}>
            <span style={styles.inviteIcon}>🏘️</span>
            <p style={styles.inviteText}>Welcome back!</p>
          </div>

          <h1 style={styles.neighborhoodName}>{neighborhood.name}</h1>

          {neighborhood.description && (
            <p style={styles.description}>{neighborhood.description}</p>
          )}

          <div style={styles.infoBox}>
            <p>
              You were previously a member of this neighborhood.
              {neighborhood.settings?.require_approval !== false
                ? " Your rejoin request will need admin approval."
                : " You can rejoin immediately."}
            </p>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            onClick={handleRejoinRequest}
            disabled={submitting}
            style={styles.primaryButton}
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

  // Success state after requesting to join
  if (success) {
    return (
      <div className="fullPageContainer">
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>Request Sent!</h1>
          <p style={styles.message}>
            Your request to join <strong>{neighborhood.name}</strong> has been
            sent. An admin will review your request and you&apos;ll be notified
            when approved.
          </p>
          <Link href="/dashboard" style={styles.primaryButton}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Logged in user can request to join
  return (
    <div className="fullPageContainer">
      <div style={styles.card}>
        <div style={styles.inviteHeader}>
          <span style={styles.inviteIcon}>🏘️</span>
          <p style={styles.inviteText}>You&apos;ve been invited to join</p>
        </div>

        <h1 style={styles.neighborhoodName}>{neighborhood.name}</h1>

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
  card: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "420px",
    textAlign: "center",
  },
  inviteHeader: {
    marginBottom: "0.5rem",
  },
  inviteIcon: {
    fontSize: "3rem",
    display: "block",
    marginBottom: "0.5rem",
  },
  inviteText: {
    color: "#666",
    fontSize: "0.875rem",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  neighborhoodName: {
    margin: "0.5rem 0",
    fontSize: "1.75rem",
    fontWeight: "700",
    color: "#111",
  },
  title: {
    margin: "0 0 1rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  description: {
    color: "#444",
    marginBottom: "0.5rem",
    fontSize: "1rem",
  },
  location: {
    color: "#666",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  divider: {
    height: "1px",
    backgroundColor: "#e5e7eb",
    margin: "1.5rem 0",
  },
  ctaText: {
    color: "#444",
    marginBottom: "1.5rem",
    fontSize: "0.95rem",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  primaryButton: {
    display: "block",
    backgroundColor: "#2563eb",
    color: "white",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "600",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  secondaryButton: {
    display: "block",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: "500",
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
  },
  infoBox: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    color: "#0369a1",
    textAlign: "left",
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
