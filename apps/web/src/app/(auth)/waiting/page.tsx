import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "@/app/globals.css";
import styles from "../auth.module.css";
import { SignOutButton } from "./SignOutButton";

export default async function WaitingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch pending memberships with neighborhood names
  const { data: pendingMemberships } = await supabase
    .from("memberships")
    .select("id, neighborhood:neighborhoods(name)")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .is("deleted_at", null);

  // If no pending memberships, they may have been approved or have none
  if (!pendingMemberships || pendingMemberships.length === 0) {
    redirect("/dashboard");
  }

  // Supabase returns joined neighborhood as { name }[] — extract first element's name
  const neighborhoodNames = pendingMemberships
    .map((m) => {
      const neighborhood = m.neighborhood;
      if (Array.isArray(neighborhood)) return neighborhood[0]?.name;
      return (neighborhood as { name: string } | null)?.name;
    })
    .filter((name): name is string => Boolean(name));

  return (
    <div className="fullPageContainer">
      <div className={styles.card}>
        <h1 className={styles.title}>Waiting for approval</h1>
        <p className={styles.subtitle}>
          You&apos;ve requested to join:
        </p>
        <ul style={{ margin: 0, paddingLeft: "var(--space-5)" }}>
          {neighborhoodNames.map((name) => (
            <li key={name} style={{ marginBottom: "var(--space-1)" }}>{name}</li>
          ))}
        </ul>
        <p className={styles.hint}>
          A neighbor will review your request soon. Once approved, you&apos;ll have
          full access to your neighborhood on Block Club.
        </p>
        <Link
          href="/dashboard"
          className={styles.button}
          style={{ textAlign: "center", textDecoration: "none", display: "block" }}
          data-testid="waiting-check-again-link"
        >
          Check again
        </Link>
        <div className={styles.footer}>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
