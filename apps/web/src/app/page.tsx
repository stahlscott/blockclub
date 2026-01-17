import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import styles from "./home.module.css";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Block Club</h1>
        <p className={styles.subtitle}>
          Connect with your neighbors. Share resources. Build community.
        </p>
        <p className={styles.location}>Lakewood, Ohio</p>

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📚</div>
            <h3 className={styles.featureTitle}>Share & Borrow</h3>
            <p className={styles.featureText}>Lending library for tools, books, and more</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💬</div>
            <h3 className={styles.featureTitle}>Stay Connected</h3>
            <p className={styles.featureText}>Neighborhood bulletin board for updates</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👥</div>
            <h3 className={styles.featureTitle}>Know Your Neighbors</h3>
            <p className={styles.featureText}>Directory to connect with your community</p>
          </div>
        </div>

        <div className={styles.cta}>
          <Link href="/signin" className={styles.primaryButton}>
            Sign In
          </Link>
        </div>

        <div className={styles.inviteSection}>
          <p className={styles.inviteNote}>
            Block Club is invite-only. If your neighborhood is already on Block Club, ask a neighbor for an invite link.
          </p>
          <p className={styles.contactNote}>
            Want to start a Block Club on your Lakewood street?{" "}
            <a href="mailto:hello@lakewoodblock.club" className={styles.contactLink}>
              Get in touch
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
