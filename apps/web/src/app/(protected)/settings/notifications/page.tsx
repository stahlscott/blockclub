import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getImpersonationContext } from "@/lib/impersonation";
import { getAuthContext } from "@/lib/auth-context";
import { NotificationsForm } from "./NotificationsForm";
import type { NotificationPreferences, EmailEntry } from "@blockclub/shared";
import styles from "../settings.module.css";

/**
 * Default notification preferences for users without saved preferences
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  version: 1,
  email_enabled: true,
  notification_email: null,
  channels: {
    loan_requested: true,
    loan_approved: true,
    loan_declined: true,
    loan_returned: true,
  },
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/signin");
  }

  const impersonationContext = await getImpersonationContext();
  const isImpersonating = impersonationContext?.isImpersonating ?? false;

  // Get the effective user context for data fetching
  const { effectiveUserId, queryClient } = await getAuthContext(supabase, authUser);

  // Fetch user with notification preferences and custom emails
  const { data: user } = await queryClient
    .from("users")
    .select("email, emails, notification_preferences")
    .eq("id", effectiveUserId)
    .single();

  const preferences = (user?.notification_preferences as NotificationPreferences) || DEFAULT_PREFERENCES;
  const authEmail = user?.email || authUser.email || "";
  const customEmails = (user?.emails as EmailEntry[]) || [];

  return (
    <div className={styles.container}>
      <Link href="/settings" className={styles.backLink}>
        &larr; Back to Settings
      </Link>

      <h1 className={styles.title}>Notification Settings</h1>

      {isImpersonating && (
        <div className={styles.card}>
          <p className={styles.impersonationNotice}>
            Notification settings are view-only while viewing as another user.
          </p>
        </div>
      )}

      <NotificationsForm
        initialPreferences={preferences}
        authEmail={authEmail}
        customEmails={customEmails}
        isImpersonating={isImpersonating}
      />
    </div>
  );
}
