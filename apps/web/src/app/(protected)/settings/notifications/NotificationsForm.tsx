"use client";

import { useActionState } from "react";
import { updateNotificationPreferences, type SettingsActionState } from "../actions";
import type { NotificationPreferences, EmailEntry } from "@blockclub/shared";
import styles from "../settings.module.css";

interface Props {
  initialPreferences: NotificationPreferences;
  authEmail: string;
  customEmails: EmailEntry[];
  isImpersonating: boolean;
}

export function NotificationsForm({
  initialPreferences,
  authEmail,
  customEmails,
  isImpersonating,
}: Props) {
  const [state, formAction, isPending] = useActionState<SettingsActionState, FormData>(
    updateNotificationPreferences,
    {}
  );

  // Determine the current selected email value for the dropdown
  const currentEmailValue = initialPreferences.notification_email || "auth";

  return (
    <form action={formAction}>
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Email Notifications</h2>

        {state.error && <p className={styles.error}>{state.error}</p>}
        {state.success && <p className={styles.success}>Preferences saved!</p>}

        <div className={styles.checkboxField}>
          <input
            type="checkbox"
            id="emailEnabled"
            name="emailEnabled"
            defaultChecked={initialPreferences.email_enabled}
            className={styles.checkbox}
            disabled={isImpersonating}
            data-testid="notifications-email-enabled-checkbox"
          />
          <label htmlFor="emailEnabled" className={styles.checkboxLabel}>
            <span className={styles.checkboxTitle}>Enable email notifications</span>
            <span className={styles.checkboxHint}>
              Receive emails when someone requests your items, and when your borrow requests are approved or declined.
            </span>
          </label>
        </div>

        <div className={styles.divider} />

        <div className={styles.inputGroup}>
          <label htmlFor="notificationEmail" className={styles.label}>
            Send notifications to
          </label>
          <select
            id="notificationEmail"
            name="notificationEmail"
            defaultValue={currentEmailValue}
            className={styles.input}
            disabled={isImpersonating}
            data-testid="notifications-email-select"
          >
            <option value="auth">{authEmail} (Account email)</option>
            {customEmails.map((entry) => (
              <option key={entry.email} value={entry.email}>
                {entry.email} ({entry.label})
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            Choose which email address receives your notifications.
          </span>
        </div>

        {!isImpersonating && (
          <button
            type="submit"
            disabled={isPending}
            className={styles.button}
            data-testid="notifications-save-button"
          >
            {isPending ? "Saving..." : "Save Preferences"}
          </button>
        )}
      </div>
    </form>
  );
}
