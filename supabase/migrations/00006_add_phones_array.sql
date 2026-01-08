-- Add phones array column to users table
-- This allows multiple labeled phone numbers per household
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phones jsonb DEFAULT '[]'::jsonb;

-- Migrate existing phone data to new format
UPDATE public.users 
SET phones = jsonb_build_array(jsonb_build_object('label', 'Primary', 'number', phone))
WHERE phone IS NOT NULL AND phone != '' AND (phones IS NULL OR phones = '[]'::jsonb);

-- Add a comment explaining the structure
COMMENT ON COLUMN public.users.phones IS 'Array of {label: string, number: string} objects for household phone numbers';
