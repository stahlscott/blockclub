/**
 * Notification dispatcher - central entry point for all notifications.
 * Handles user preference checking, data fetching, and email sending.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { displayDateLocal } from "@/lib/date-utils";
import { sendEmail } from "./service";
import {
  loanRequestedTemplate,
  loanApprovedTemplate,
  loanDeclinedTemplate,
  loanReturnedTemplate,
} from "./templates";
import type { NotificationType, LoanNotificationData } from "./types";
import type { NotificationPreferences } from "@blockclub/shared";

// Query result types for complex joins
interface LoanRequestedQuery {
  id: string;
  notes: string | null;
  borrower: { id: string; name: string };
  item: {
    id: string;
    name: string;
    owner_id: string;
    neighborhood: { slug: string };
  };
}

interface LoanWithBorrowerQuery {
  id: string;
  due_date: string | null;
  borrower: {
    id: string;
    name: string;
    email: string;
    notification_preferences: NotificationPreferences | null;
  };
  item: {
    id: string;
    name: string;
    owner: { id: string; name: string };
    neighborhood: { slug: string };
  };
}

interface LoanReturnedQuery {
  id: string;
  borrower: { id: string; name: string };
  item: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      email: string;
      notification_preferences: NotificationPreferences | null;
    };
    neighborhood: { slug: string };
  };
}

interface OwnerQuery {
  id: string;
  name: string;
  email: string;
  notification_preferences: NotificationPreferences | null;
}

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

/**
 * Resolve the email address to use based on user preferences.
 * Returns null if notifications are disabled.
 */
function resolveEmailAddress(
  authEmail: string,
  prefs: NotificationPreferences,
  channel: NotificationType
): string | null {
  // Check master toggle
  if (!prefs.email_enabled) {
    return null;
  }

  // Check channel-specific toggle
  if (!prefs.channels[channel]) {
    return null;
  }

  // Use custom email if set, otherwise auth email
  return prefs.notification_email || authEmail;
}

/**
 * Send a loan requested notification to the item owner.
 */
export async function notifyLoanRequested(loanId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch loan with all related data
    const { data: loanData, error } = await supabase
      .from("loans")
      .select(`
        id,
        notes,
        borrower:users!loans_borrower_id_fkey(id, name),
        item:items!loans_item_id_fkey(
          id,
          name,
          owner_id,
          neighborhood:neighborhoods!items_neighborhood_id_fkey(slug)
        )
      `)
      .eq("id", loanId)
      .single();

    if (error || !loanData) {
      logger.error("Failed to fetch loan for notification", error, { loanId });
      return;
    }

    // Cast to expected type (Supabase doesn't infer nested joins well)
    const loan = loanData as unknown as LoanRequestedQuery;

    // Fetch owner with notification preferences
    const { data: ownerData, error: ownerError } = await supabase
      .from("users")
      .select("id, name, email, notification_preferences")
      .eq("id", loan.item.owner_id)
      .single();

    if (ownerError || !ownerData) {
      logger.error("Failed to fetch owner for notification", ownerError, { loanId });
      return;
    }

    const owner = ownerData as unknown as OwnerQuery;
    const prefs = owner.notification_preferences || DEFAULT_PREFERENCES;
    const emailAddress = resolveEmailAddress(owner.email, prefs, "loan_requested");

    if (!emailAddress) {
      logger.debug("Loan requested notification skipped (disabled)", {
        loanId,
        ownerId: owner.id,
      });
      return;
    }

    const data: LoanNotificationData = {
      loanId: loan.id,
      itemId: loan.item.id,
      itemName: loan.item.name,
      borrowerName: loan.borrower.name,
      ownerName: owner.name,
      neighborhoodSlug: loan.item.neighborhood.slug,
      notes: loan.notes,
    };

    const { subject, html } = loanRequestedTemplate(data);
    const result = await sendEmail({ to: emailAddress, subject, html });

    if (result.success) {
      logger.info("Loan requested notification sent", {
        loanId,
        ownerId: owner.id,
        messageId: result.messageId,
      });
    }
  } catch (error) {
    logger.error("Failed to send loan requested notification", error, { loanId });
  }
}

/**
 * Send a loan approved notification to the borrower.
 */
export async function notifyLoanApproved(loanId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch loan with all related data
    const { data: loanData, error } = await supabase
      .from("loans")
      .select(`
        id,
        due_date,
        borrower:users!loans_borrower_id_fkey(id, name, email, notification_preferences),
        item:items!loans_item_id_fkey(
          id,
          name,
          owner:users!items_owner_id_fkey(id, name),
          neighborhood:neighborhoods!items_neighborhood_id_fkey(slug)
        )
      `)
      .eq("id", loanId)
      .single();

    if (error || !loanData) {
      logger.error("Failed to fetch loan for notification", error, { loanId });
      return;
    }

    const loan = loanData as unknown as LoanWithBorrowerQuery;
    const prefs = loan.borrower.notification_preferences || DEFAULT_PREFERENCES;
    const emailAddress = resolveEmailAddress(loan.borrower.email, prefs, "loan_approved");

    if (!emailAddress) {
      logger.debug("Loan approved notification skipped (disabled)", {
        loanId,
        borrowerId: loan.borrower.id,
      });
      return;
    }

    const data: LoanNotificationData = {
      loanId: loan.id,
      itemId: loan.item.id,
      itemName: loan.item.name,
      borrowerName: loan.borrower.name,
      ownerName: loan.item.owner.name,
      neighborhoodSlug: loan.item.neighborhood.slug,
      dueDate: loan.due_date ? displayDateLocal(loan.due_date) : null,
    };

    const { subject, html } = loanApprovedTemplate(data);
    const result = await sendEmail({ to: emailAddress, subject, html });

    if (result.success) {
      logger.info("Loan approved notification sent", {
        loanId,
        borrowerId: loan.borrower.id,
        messageId: result.messageId,
      });
    }
  } catch (error) {
    logger.error("Failed to send loan approved notification", error, { loanId });
  }
}

/**
 * Send a loan declined notification to the borrower.
 */
export async function notifyLoanDeclined(loanId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch loan with all related data
    const { data: loanData, error } = await supabase
      .from("loans")
      .select(`
        id,
        borrower:users!loans_borrower_id_fkey(id, name, email, notification_preferences),
        item:items!loans_item_id_fkey(
          id,
          name,
          owner:users!items_owner_id_fkey(id, name),
          neighborhood:neighborhoods!items_neighborhood_id_fkey(slug)
        )
      `)
      .eq("id", loanId)
      .single();

    if (error || !loanData) {
      logger.error("Failed to fetch loan for notification", error, { loanId });
      return;
    }

    // Reuse the same type (just no due_date)
    const loan = loanData as unknown as LoanWithBorrowerQuery;
    const prefs = loan.borrower.notification_preferences || DEFAULT_PREFERENCES;
    const emailAddress = resolveEmailAddress(loan.borrower.email, prefs, "loan_declined");

    if (!emailAddress) {
      logger.debug("Loan declined notification skipped (disabled)", {
        loanId,
        borrowerId: loan.borrower.id,
      });
      return;
    }

    const data: LoanNotificationData = {
      loanId: loan.id,
      itemId: loan.item.id,
      itemName: loan.item.name,
      borrowerName: loan.borrower.name,
      ownerName: loan.item.owner.name,
      neighborhoodSlug: loan.item.neighborhood.slug,
    };

    const { subject, html } = loanDeclinedTemplate(data);
    const result = await sendEmail({ to: emailAddress, subject, html });

    if (result.success) {
      logger.info("Loan declined notification sent", {
        loanId,
        borrowerId: loan.borrower.id,
        messageId: result.messageId,
      });
    }
  } catch (error) {
    logger.error("Failed to send loan declined notification", error, { loanId });
  }
}

/**
 * Send a loan returned notification to the owner.
 */
export async function notifyLoanReturned(loanId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Fetch loan with all related data
    const { data: loanData, error } = await supabase
      .from("loans")
      .select(`
        id,
        borrower:users!loans_borrower_id_fkey(id, name),
        item:items!loans_item_id_fkey(
          id,
          name,
          owner:users!items_owner_id_fkey(id, name, email, notification_preferences),
          neighborhood:neighborhoods!items_neighborhood_id_fkey(slug)
        )
      `)
      .eq("id", loanId)
      .single();

    if (error || !loanData) {
      logger.error("Failed to fetch loan for notification", error, { loanId });
      return;
    }

    const loan = loanData as unknown as LoanReturnedQuery;
    const prefs = loan.item.owner.notification_preferences || DEFAULT_PREFERENCES;
    const emailAddress = resolveEmailAddress(loan.item.owner.email, prefs, "loan_returned");

    if (!emailAddress) {
      logger.debug("Loan returned notification skipped (disabled)", {
        loanId,
        ownerId: loan.item.owner.id,
      });
      return;
    }

    const data: LoanNotificationData = {
      loanId: loan.id,
      itemId: loan.item.id,
      itemName: loan.item.name,
      borrowerName: loan.borrower.name,
      ownerName: loan.item.owner.name,
      neighborhoodSlug: loan.item.neighborhood.slug,
    };

    const { subject, html } = loanReturnedTemplate(data);
    const result = await sendEmail({ to: emailAddress, subject, html });

    if (result.success) {
      logger.info("Loan returned notification sent", {
        loanId,
        ownerId: loan.item.owner.id,
        messageId: result.messageId,
      });
    }
  } catch (error) {
    logger.error("Failed to send loan returned notification", error, { loanId });
  }
}
