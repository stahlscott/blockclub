-- Add new profile fields to users table
ALTER TABLE public.users ADD COLUMN address TEXT;
ALTER TABLE public.users ADD COLUMN unit TEXT;
ALTER TABLE public.users ADD COLUMN move_in_year INTEGER;
ALTER TABLE public.users ADD COLUMN children TEXT;
ALTER TABLE public.users ADD COLUMN pets TEXT;

-- Add check constraint for move_in_year
ALTER TABLE public.users ADD CONSTRAINT check_move_in_year 
  CHECK (move_in_year IS NULL OR (move_in_year >= 1900 AND move_in_year <= EXTRACT(YEAR FROM NOW()) + 1));

-- Remove household_id from memberships (no longer needed)
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_household_id_fkey;
ALTER TABLE public.memberships DROP COLUMN IF EXISTS household_id;

-- Drop households table (never implemented)
DROP INDEX IF EXISTS idx_households_neighborhood;
DROP POLICY IF EXISTS "Members can read neighborhood households" ON public.households;
DROP POLICY IF EXISTS "Admins can create households" ON public.households;
DROP POLICY IF EXISTS "Admins can update households" ON public.households;
DROP POLICY IF EXISTS "Admins can delete households" ON public.households;
DROP TRIGGER IF EXISTS update_households_updated_at ON public.households;
DROP TABLE IF EXISTS public.households;
