-- Migration: Membership history protection
-- Ordinary user-facing membership removal is soft-delete only. Physical
-- neighborhood teardown remains a separate staff-only operational exception.

DROP POLICY IF EXISTS "Users can delete own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can delete neighborhood memberships" ON public.memberships;
REVOKE DELETE ON TABLE public.memberships FROM anon, authenticated;
