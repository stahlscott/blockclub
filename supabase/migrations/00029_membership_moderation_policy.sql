-- Migration: Explicit pending-membership moderation transitions
-- Admin moderation is limited to pending -> active or pending -> inactive with
-- soft deletion. Identity and neighborhood relationships remain immutable.

DROP POLICY IF EXISTS "Admins can update memberships" ON public.memberships;

CREATE POLICY "Admins can moderate pending memberships"
  ON public.memberships FOR UPDATE
  USING (
    is_neighborhood_admin(neighborhood_id, auth.uid())
    AND status = 'pending'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    is_neighborhood_admin(neighborhood_id, auth.uid())
    AND user_id = memberships.user_id
    AND neighborhood_id = memberships.neighborhood_id
    AND role = memberships.role
    AND (
      (status = 'active' AND deleted_at IS NULL)
      OR (status = 'inactive' AND deleted_at IS NOT NULL)
    )
  );

COMMENT ON POLICY "Admins can moderate pending memberships" ON public.memberships IS
  'Allows only pending -> active approval or pending -> inactive soft-deletion; user, neighborhood, and role remain immutable.';
