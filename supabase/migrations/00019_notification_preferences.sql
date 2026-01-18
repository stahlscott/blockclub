-- Add notification preferences to users table
-- Supports email notifications for loan events with extensible channel structure

ALTER TABLE public.users
ADD COLUMN notification_preferences JSONB NOT NULL DEFAULT '{
  "version": 1,
  "email_enabled": true,
  "notification_email": null,
  "channels": {
    "loan_requested": true,
    "loan_approved": true,
    "loan_declined": true,
    "loan_returned": true
  }
}'::jsonb;

COMMENT ON COLUMN public.users.notification_preferences IS
'User notification preferences. Structure:
{
  version: number - Schema version for future migrations
  email_enabled: boolean - Master toggle for email notifications
  notification_email: string | null - Custom email address, null = use auth email
  channels: {
    loan_requested: boolean - Notify when someone requests your item
    loan_approved: boolean - Notify when your borrow request is approved
    loan_declined: boolean - Notify when your borrow request is declined
    loan_returned: boolean - Notify when borrower returns your item
  }
}';
