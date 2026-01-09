"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "@/app/globals.css";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
          name, // Store name in user metadata
        },
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
        // Email confirmation required - store redirect in localStorage for after confirmation
        if (redirectTo !== "/dashboard") {
          localStorage.setItem("authRedirect", redirectTo);
        }
        setSuccess(true);
      }
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="fullPageContainer">
        <div style={styles.card}>
          <h1 style={styles.title}>Check your email</h1>
          <p style={styles.text}>
            We&apos;ve sent a confirmation link to <strong>{email}</strong>.
          </p>
          <p style={styles.text}>
            Click the link in the email to activate your account.
          </p>
          <Link href="/signin" style={styles.link}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fullPageContainer">
      <div style={styles.card}>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Join your neighborhood on Front Porch</p>

        <form onSubmit={handleSignUp} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="name" style={styles.label}>
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={styles.input}
              placeholder="Your name"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              placeholder="At least 6 characters"
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link href="/signin" style={styles.link}>
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
          <div style={styles.card}>
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
  },
  title: {
    margin: "0 0 0.5rem 0",
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  subtitle: {
    margin: "0 0 1.5rem 0",
    color: "#666",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "1rem",
  },
  button: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  error: {
    color: "#dc2626",
    fontSize: "0.875rem",
    margin: 0,
  },
  footer: {
    marginTop: "1.5rem",
    textAlign: "center",
    color: "#666",
    fontSize: "0.875rem",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
  },
  text: {
    color: "#666",
    marginBottom: "1rem",
  },
};
