-- Add moved_out status to membership_status enum
-- This allows members to mark themselves (or be marked by admins) as having moved out
-- while keeping their account active to join other neighborhoods

ALTER TYPE membership_status ADD VALUE 'moved_out';
