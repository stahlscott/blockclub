"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "../auth.module.css";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
  }

  return (
    <button
      onClick={handleSignOut}
      className={styles.changeEmailLink}
      data-testid="waiting-signout-button"
    >
      Sign out
    </button>
  );
}
