-- Migration: Staff Impersonation Support
--
-- This migration adds:
-- 1. staff_actor_id columns for audit trail during impersonation
-- 2. Auto-promote first active member to admin trigger
--
-- Staff admins are identified by email in STAFF_ADMIN_EMAILS env var.
-- They should NOT have memberships - they access neighborhoods via impersonation.

-- Add staff_actor_id columns for audit trail
-- These track which staff admin performed an action while impersonating a user

ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS staff_actor_id UUID REFERENCES public.users(id);

ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS staff_actor_id UUID REFERENCES public.users(id);

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS staff_actor_id UUID REFERENCES public.users(id);

ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS staff_actor_id UUID REFERENCES public.users(id);

ALTER TABLE public.neighborhoods
ADD COLUMN IF NOT EXISTS staff_actor_id UUID REFERENCES public.users(id);

-- Add indexes for audit queries (only index non-null values for efficiency)
CREATE INDEX IF NOT EXISTS idx_items_staff_actor
ON public.items(staff_actor_id) WHERE staff_actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loans_staff_actor
ON public.loans(staff_actor_id) WHERE staff_actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_staff_actor
ON public.posts(staff_actor_id) WHERE staff_actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_staff_actor
ON public.memberships(staff_actor_id) WHERE staff_actor_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.items.staff_actor_id IS
'Staff admin who performed this action while impersonating the owner';

COMMENT ON COLUMN public.loans.staff_actor_id IS
'Staff admin who performed this action while impersonating a user';

COMMENT ON COLUMN public.posts.staff_actor_id IS
'Staff admin who performed this action while impersonating the author';

COMMENT ON COLUMN public.memberships.staff_actor_id IS
'Staff admin who performed this action while impersonating a user';

COMMENT ON COLUMN public.neighborhoods.staff_actor_id IS
'Staff admin who created this neighborhood';

-- Function to auto-promote first active member to admin
-- This handles the case where staff creates a neighborhood (no membership created)
-- and the first real user to join should become the admin
CREATE OR REPLACE FUNCTION auto_promote_first_member()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only apply to active memberships on INSERT
  IF NEW.status = 'active' AND TG_OP = 'INSERT' THEN
    -- Count existing active admin memberships in this neighborhood
    SELECT COUNT(*) INTO admin_count
    FROM public.memberships
    WHERE neighborhood_id = NEW.neighborhood_id
      AND role = 'admin'
      AND status = 'active'
      AND deleted_at IS NULL
      AND id != NEW.id;

    -- If no admins exist, promote this member to admin
    IF admin_count = 0 THEN
      NEW.role := 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-promotion
DROP TRIGGER IF EXISTS trigger_auto_promote_first_member ON public.memberships;

CREATE TRIGGER trigger_auto_promote_first_member
  BEFORE INSERT ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_first_member();

-- Also handle the case where a pending membership becomes active
-- (e.g., when admin approves a join request on a neighborhood with no admin)
CREATE OR REPLACE FUNCTION auto_promote_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only apply when status changes TO active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Count existing active admin memberships in this neighborhood
    SELECT COUNT(*) INTO admin_count
    FROM public.memberships
    WHERE neighborhood_id = NEW.neighborhood_id
      AND role = 'admin'
      AND status = 'active'
      AND deleted_at IS NULL
      AND id != NEW.id;

    -- If no admins exist, promote this member to admin
    IF admin_count = 0 THEN
      NEW.role := 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_promote_on_status_change ON public.memberships;

CREATE TRIGGER trigger_auto_promote_on_status_change
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_on_status_change();
