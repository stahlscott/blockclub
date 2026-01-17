"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import "@/app/globals.css";
import styles from "../join.module.css";

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
          .maybeSingle();

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

    // Always insert as pending - database AFTER INSERT trigger handles auto-approval
    const { data: inserted, error: joinError } = await supabase
      .from("memberships")
      .insert({
        user_id: user.id,
        neighborhood_id: neighborhood.id,
        role: "member",
        status: "pending",
      })
      .select("id")
      .single();

    if (joinError) {
      setError(joinError.message);
      setSubmitting(false);
      return;
    }

    // Re-fetch to get the status after the AFTER INSERT trigger ran
    const { data: membership } = await supabase
      .from("memberships")
      .select("status")
      .eq("id", inserted.id)
      .single();

    // Check if trigger promoted to active
    if (membership?.status === "active") {
      router.push("/dashboard");
    } else {
      setSuccess(true);
    }

    setSubmitting(false);
  };

  const handleRejoinRequest = async () => {
    if (!user || !neighborhood || !existingMembership) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    // For rejoin (UPDATE), we keep the app logic since the INSERT trigger won't fire
    // First member always gets auto-approved, even if require_approval is true
    const { count: activeMemberCount } = await supabase
      .from("memberships")
      .select("*", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhood.id)
      .eq("status", "active")
      .is("deleted_at", null);

    const isFirstMember = activeMemberCount === 0;
    const requiresApproval =
      !isFirstMember && neighborhood.settings?.require_approval !== false;

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

    if (!requiresApproval) {
      router.push("/dashboard");
    } else {
      setSuccess(true);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="fullPageContainer">
        <div className={styles.card}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Neighborhood not found
  if (!neighborhood) {
    return (
      <div className="fullPageContainer">
        <div className={styles.card}>
          <h1 className={styles.title}>Neighborhood Not Found</h1>
          <p className={styles.message}>
            This invite link may be invalid or the neighborhood no longer
            exists.
          </p>
          <Link href="/" className={styles.secondaryButton}>
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
        <div className={styles.card}>
          <div className={styles.inviteHeader}>
            <span className={styles.inviteIcon}>🏘️</span>
            <p className={styles.inviteText}>You&apos;ve been invited to join</p>
          </div>

          <h1 className={styles.neighborhoodName}>{neighborhood.name}</h1>

          {neighborhood.description && (
            <p className={styles.description}>{neighborhood.description}</p>
          )}

          {neighborhood.location && (
            <p className={styles.location}>{neighborhood.location}</p>
          )}

          <div className={styles.divider} />

          <p className={styles.ctaText}>
            Create an account or sign in to join this neighborhood.
          </p>

          <div className={styles.buttonGroup}>
            <Link
              href={`/signup?redirect=/join/${slug}`}
              className={styles.primaryButton}
            >
              Sign Up
            </Link>
            <Link
              href={`/signin?redirect=/join/${slug}`}
              className={styles.secondaryButton}
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
              <div className={styles.pendingBadge}>Pending Approval</div>
              <p className={styles.message}>
                Your request to join this neighborhood is pending approval from
                an admin.
              </p>
              <Link href="/dashboard" className={styles.secondaryButton}>
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <p className={styles.message}>
                Your membership status is: {existingMembership.status}
              </p>
              <Link href="/dashboard" className={styles.secondaryButton}>
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
        <div className={styles.card}>
          <div className={styles.inviteHeader}>
            <span className={styles.inviteIcon}>🏘️</span>
            <p className={styles.inviteText}>Welcome back!</p>
          </div>

          <h1 className={styles.neighborhoodName}>{neighborhood.name}</h1>

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

  // Success state after requesting to join
  if (success) {
    return (
      <div className="fullPageContainer">
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Request Sent!</h1>
          <p className={styles.message}>
            Your request to join <strong>{neighborhood.name}</strong> has been
            sent. An admin will review your request and you&apos;ll be notified
            when approved.
          </p>
          <Link href="/dashboard" className={styles.primaryButton}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Logged in user can request to join
  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <div className={styles.inviteHeader}>
          <span className={styles.inviteIcon}>🏘️</span>
          <p className={styles.inviteText}>You&apos;ve been invited to join</p>
        </div>

        <h1 className={styles.neighborhoodName}>{neighborhood.name}</h1>

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
