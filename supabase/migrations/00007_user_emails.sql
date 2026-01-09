-- Add emails column to users table
-- Stores array of {label: string, email: string} objects for contact emails

ALTER TABLE public.users
ADD COLUMN emails JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.users.emails IS 'Array of {label: string, email: string} objects for contact emails';
