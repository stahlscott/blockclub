"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "@/app/globals.css";
import styles from "../auth.module.css";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const neighborhoodId = searchParams.get("neighborhoodId");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Resend confirmation state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Sign up the user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          address,
          pending_neighborhood_id: neighborhoodId || null,
        },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Check if email confirmation is required
      if (data.user.identities?.length === 0) {
        setError("Email already registered. Please sign in instead.");
        setLoading(false);
        return;
      }

      // User profile is automatically created by database trigger (handle_new_user)
      // which fires on auth.users insert

      if (data.session) {
        // User is signed in (no email confirmation required)
        router.push(redirectTo);
      } else {
        // Email confirmation required - store redirect in cookie for after confirmation
        if (redirectTo !== "/dashboard") {
          document.cookie = `authRedirect=${encodeURIComponent(redirectTo)}; path=/; max-age=86400; SameSite=Lax`;
        }
        setSuccess(true);
      }
    }

    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setResendError(null);

    const supabase = createClient();

    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (resendErr) {
      setResendError(resendErr.message);
    } else {
      setResendSuccess(true);
      // Auto-hide success message after 5 seconds
      setTimeout(() => setResendSuccess(false), 5000);
    }

    setResendLoading(false);
  };


  if (success) {
    return (
      <div className="fullPageContainer">
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.text}>
            We&apos;ve sent a confirmation link to{" "}
            <span className={styles.emailDisplay}>{email}</span>.
          </p>
          <p className={styles.text}>
            Click the link in the email to activate your account.
          </p>

          <div className={styles.successActions}>
            {/* Resend confirmation */}
            <div>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className={styles.resendButton}
                data-testid="signup-resend-confirmation-button"
              >
                {resendLoading ? "Sending..." : "Resend confirmation email"}
              </button>
              {resendSuccess && (
                <p className={styles.success} data-testid="signup-resend-success">
                  Confirmation email sent!
                </p>
              )}
              {resendError && (
                <p className={styles.error} data-testid="signup-resend-error">
                  {resendError}
                </p>
              )}
            </div>

            <p className={styles.hint}>
              Wrong email? You&apos;ll need to{" "}
              <Link href="/signup" className={styles.link}>
                sign up again
              </Link>{" "}
              with the correct address.
            </p>
          </div>

          <p className={styles.footer}>
            <Link href="/signin" className={styles.link}>
              &larr; Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Join your neighborhood on Block Club</p>
        <p className={styles.hint}>
          Accounts are meant to be one per household. If someone in your home
          already has an account, ask them to share login details instead.
        </p>

        <form onSubmit={handleSignUp} className={styles.form} data-testid="signup-form">
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>
              Household Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.input}
              placeholder="e.g., The Smith Family"
              data-testid="signup-form-name-input"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="address" className={styles.label}>
              Street Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className={styles.input}
              placeholder="e.g., 123 Bunts Rd"
              data-testid="signup-form-address-input"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
              placeholder="you@example.com"
              data-testid="signup-form-email-input"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={styles.input}
              placeholder="At least 6 characters"
              data-testid="signup-form-password-input"
            />
          </div>

          {error && <p className={styles.error} data-testid="signup-form-error">{error}</p>}

          <button type="submit" disabled={loading} className={styles.button} data-testid="signup-form-submit-button">
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link href="/signin" className={styles.link} data-testid="signup-signin-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="fullPageContainer">
          <div className={styles.card}>
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
