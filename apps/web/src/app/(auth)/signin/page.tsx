"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "@/app/globals.css";
import styles from "../auth.module.css";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailNotConfirmed(false);
    setResendSuccess(false);
    setLoading(true);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        setEmailNotConfirmed(true);
        setError("Please confirm your email address before signing in.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setResendLoading(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setResendSuccess(true);
  };

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to Block Club</p>

        <form onSubmit={handleSignIn} className={styles.form} data-testid="signin-form">
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
              data-testid="signin-form-email-input"
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
              className={styles.input}
              placeholder="Your password"
              data-testid="signin-form-password-input"
            />
          </div>

          {error && <p className={styles.error} data-testid="signin-form-error">{error}</p>}

          {emailNotConfirmed && !resendSuccess && (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendLoading}
              className={styles.resendButton}
              data-testid="signin-form-resend-button"
            >
              {resendLoading ? "Sending..." : "Resend confirmation email"}
            </button>
          )}

          {resendSuccess && (
            <p className={styles.success} data-testid="signin-form-success">
              Confirmation email sent! Check your inbox.
            </p>
          )}

          <button type="submit" disabled={loading} className={styles.button} data-testid="signin-form-submit-button">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account? Ask a neighbor for an invite link.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
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
      <SignInForm />
    </Suspense>
  );
}
