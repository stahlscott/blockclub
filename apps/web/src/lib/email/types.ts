/**
 * Email service types
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type NotificationType =
  | "loan_requested"
  | "loan_approved"
  | "loan_declined"
  | "loan_returned";

export interface LoanNotificationData {
  loanId: string;
  itemId: string;
  itemName: string;
  borrowerName: string;
  ownerName: string;
  neighborhoodSlug: string;
  notes?: string | null;
  dueDate?: string | null;
}
