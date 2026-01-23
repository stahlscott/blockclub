"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "@/app/globals.css";
import styles from "../auth.module.css";

type SignInMode = "password" | "magic-link";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [mode, setMode] = useState<SignInMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

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

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    setLoading(false);

    if (magicLinkError) {
      setError(magicLinkError.message);
      return;
    }

    setMagicLinkSent(true);
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

  const switchMode = (newMode: SignInMode) => {
    setMode(newMode);
    setError(null);
    setMagicLinkSent(false);
    setEmailNotConfirmed(false);
    setResendSuccess(false);
  };

  // Magic link sent - show success state
  if (magicLinkSent) {
    return (
      <div className="fullPageContainer">
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We sent a sign-in link to <span className={styles.emailDisplay}>{email}</span>
          </p>
          <p className={styles.hint}>
            Click the link in the email to sign in. The link expires in 1 hour.
          </p>
          <div className={styles.successActions}>
            <button
              type="button"
              onClick={() => setMagicLinkSent(false)}
              className={styles.secondaryButton}
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={() => switchMode("password")}
              className={styles.changeEmailLink}
            >
              Sign in with password instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to Block Club</p>

        {mode === "password" ? (
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
              <a
                href="/forgot-password"
                className={styles.forgotPasswordLink}
                data-testid="signin-form-forgot-password-link"
              >
                Forgot password?
              </a>
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

            <button
              type="button"
              onClick={() => switchMode("magic-link")}
              className={styles.changeEmailLink}
              style={{ alignSelf: "center", marginTop: "var(--space-2)" }}
              data-testid="signin-form-magic-link-toggle"
            >
              Sign in with email link instead
            </button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className={styles.form} data-testid="signin-magic-link-form">
            <p className={styles.hint}>
              Enter your email and we&apos;ll send you a link to sign in - no password needed.
            </p>
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
                data-testid="signin-magic-link-email-input"
              />
            </div>

            {error && <p className={styles.error} data-testid="signin-magic-link-error">{error}</p>}

            <button type="submit" disabled={loading} className={styles.button} data-testid="signin-magic-link-submit-button">
              {loading ? "Sending..." : "Send sign-in link"}
            </button>

            <button
              type="button"
              onClick={() => switchMode("password")}
              className={styles.changeEmailLink}
              style={{ alignSelf: "center", marginTop: "var(--space-2)" }}
              data-testid="signin-magic-link-password-toggle"
            >
              Sign in with password instead
            </button>
          </form>
        )}

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
