"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "@/app/globals.css";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="fullPageContainer">
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.text}>
            We sent a password reset link to <span className={styles.emailDisplay}>{email}</span>
          </p>
          <p className={styles.hint}>
            Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
          </p>
          <Link href="/signin" className={styles.link} data-testid="forgot-password-success-signin-link">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a reset link
        </p>

        <form onSubmit={handleSubmit} className={styles.form} data-testid="forgot-password-form">
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
              data-testid="forgot-password-form-email-input"
            />
          </div>

          {error && <p className={styles.error} data-testid="forgot-password-form-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
            data-testid="forgot-password-form-submit-button"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className={styles.footer}>
          Remember your password?{" "}
          <Link href="/signin" className={styles.link} data-testid="forgot-password-form-signin-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
