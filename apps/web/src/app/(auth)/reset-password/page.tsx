"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "@/app/globals.css";
import styles from "../auth.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="fullPageContainer">
        <div className={styles.card}>
          <h1 className={styles.title}>Password updated</h1>
          <p className={styles.text}>
            Your password has been reset successfully.
          </p>
          <div className={styles.successActions}>
            <button
              onClick={() => router.push("/dashboard")}
              className={styles.button}
              data-testid="reset-password-continue-button"
            >
              Continue to Block Club
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.subtitle}>
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit} className={styles.form} data-testid="reset-password-form">
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="At least 8 characters"
              data-testid="reset-password-form-password-input"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="Re-enter your password"
              data-testid="reset-password-form-confirm-input"
            />
          </div>

          {error && <p className={styles.error} data-testid="reset-password-form-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={styles.button}
            data-testid="reset-password-form-submit-button"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <p className={styles.footer}>
          <Link href="/signin" className={styles.link} data-testid="reset-password-form-signin-link">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
