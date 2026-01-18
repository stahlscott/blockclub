"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getImpersonationContext } from "@/lib/impersonation";
import { logger } from "@/lib/logger";
import type { NotificationPreferences, EmailEntry } from "@blockclub/shared";

export interface SettingsActionState {
  success?: boolean;
  error?: string;
}

/**
 * Default notification preferences for new users
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

/**
 * Update user notification preferences.
 */
export async function updateNotificationPreferences(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Block updates during impersonation
  const impersonationContext = await getImpersonationContext();
  if (impersonationContext?.isImpersonating) {
    return { error: "Cannot modify settings while viewing as another user" };
  }

  const emailEnabled = formData.get("emailEnabled") === "on";
  const notificationEmail = formData.get("notificationEmail") as string | null;

  try {
    // Fetch current user data to validate email and preserve channel preferences
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("email, emails, notification_preferences")
      .eq("id", user.id)
      .single();

    if (fetchError || !userData) {
      logger.error("Failed to fetch user for settings update", fetchError, { userId: user.id });
      return { error: "Failed to fetch user data" };
    }

    // Validate that the custom notification email is in the user's emails list
    const customEmails = (userData.emails as EmailEntry[]) || [];
    if (notificationEmail && notificationEmail !== "" && notificationEmail !== "auth") {
      const isValidEmail = customEmails.some((entry) => entry.email === notificationEmail);
      if (!isValidEmail) {
        return { error: "Invalid notification email selected" };
      }
    }

    // Get current preferences to preserve channel settings
    const currentPrefs = (userData.notification_preferences as NotificationPreferences) || DEFAULT_PREFERENCES;

    // Build the preferences object, preserving existing channel settings
    const preferences: NotificationPreferences = {
      version: 1,
      email_enabled: emailEnabled,
      notification_email:
        notificationEmail === "" || notificationEmail === "auth" ? null : notificationEmail,
      channels: currentPrefs.channels, // Preserve existing channel preferences
    };

    const { error } = await supabase
      .from("users")
      .update({ notification_preferences: preferences })
      .eq("id", user.id);

    if (error) throw error;

    revalidatePath("/settings/notifications");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update preferences";
    logger.error("Failed to update notification preferences", err, { userId: user.id });
    return { error: message };
  }
}
