"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseInviteInput } from "@/lib/parse-invite-input";
import "@/app/globals.css";
import styles from "../auth.module.css";

function GetStartedForm() {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/signin");
        return;
      }
      setUserName(user.user_metadata?.name || null);
      setLoading(false);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const slug = parseInviteInput(inviteInput);
    if (!slug) {
      setError("Please enter an invite link or neighborhood name.");
      return;
    }

    router.push(`/join/${slug}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  if (loading) return null;

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>
          {userName ? `Welcome, ${userName}!` : "Welcome!"}
        </h1>
        <p className={styles.subtitle}>
          Block Club is built around neighborhoods. Join yours to get started.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="invite-input" className={styles.label}>
              Invite link or neighborhood name
            </label>
            <input
              id="invite-input"
              type="text"
              className={styles.input}
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="e.g., lakewood-heights or paste a link"
              data-testid="get-started-invite-input"
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={styles.button}
            data-testid="get-started-submit-button"
          >
            Go to neighborhood
          </button>
        </form>

        <p className={styles.hint}>
          Don&apos;t have a link? Ask a neighbor who&apos;s already on Block Club to share their invite.
        </p>

        <div className={styles.footer}>
          <button
            onClick={handleSignOut}
            className={styles.changeEmailLink}
            data-testid="get-started-signout-button"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense>
      <GetStartedForm />
    </Suspense>
  );
}
