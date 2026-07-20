-- Migration: Neighborhood-admin promotion
--
-- staff_membership_operation requires a database-allowlisted staff actor, so
-- neighborhood admins need their own promotion path. This mirrors
-- moderate_pending_membership: the actor is auth.uid(), validated in-function
-- against an active admin membership of the target's neighborhood.

CREATE TYPE public.role_change_result AS (
  success BOOLEAN,
  reason TEXT,
  membership_id UUID,
  neighborhood_id UUID,
  role public.membership_role,
  affected_membership_count INTEGER
);

CREATE OR REPLACE FUNCTION public.promote_membership_to_admin(
  p_membership_id UUID
)
RETURNS public.role_change_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership public.memberships%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.id = p_membership_id
    AND m.status = 'active'
    AND m.role = 'member'
    AND m.deleted_at IS NULL
    AND public.is_neighborhood_admin(m.neighborhood_id, auth.uid())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN ROW(FALSE, 'not_authorized_or_conflict', p_membership_id, NULL, NULL, 0)::public.role_change_result;
  END IF;

  UPDATE public.memberships
  SET role = 'admin'
  WHERE id = v_membership.id
    AND status = 'active'
    AND role = 'member'
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 1 THEN
    RETURN ROW(FALSE, 'conflict', v_membership.id, v_membership.neighborhood_id, NULL, 0)::public.role_change_result;
  END IF;

  RETURN ROW(TRUE, 'updated', v_membership.id, v_membership.neighborhood_id, 'admin'::public.membership_role, v_count)::public.role_change_result;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_membership_to_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_membership_to_admin(UUID) TO authenticated;

COMMENT ON FUNCTION public.promote_membership_to_admin(UUID) IS
  'Atomically promotes an active member to admin when the caller is an active admin of the same neighborhood. Returns an affected-row result independent of SELECT policy visibility.';
