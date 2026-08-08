-- Migration: Atomic pending-membership moderation
-- The function returns its own affected-row result so PostgREST SELECT policy
-- visibility cannot turn a successful moderation into a false zero-row result.

CREATE TYPE public.membership_moderation_result AS (
  success BOOLEAN,
  reason TEXT,
  membership_id UUID,
  neighborhood_id UUID,
  status public.membership_status,
  deleted_at TIMESTAMPTZ,
  affected_membership_count INTEGER
);

CREATE OR REPLACE FUNCTION public.moderate_pending_membership(
  p_membership_id UUID,
  p_decision TEXT
)
RETURNS public.membership_moderation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership public.memberships%ROWTYPE;
  v_status public.membership_status;
  v_deleted_at TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  IF p_decision NOT IN ('approve', 'decline') THEN
    RETURN ROW(FALSE, 'invalid_decision', p_membership_id, NULL, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.id = p_membership_id
    AND m.status = 'pending'
    AND m.deleted_at IS NULL
    AND public.is_neighborhood_admin(m.neighborhood_id, auth.uid())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN ROW(FALSE, 'not_authorized_or_conflict', p_membership_id, NULL, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  IF p_decision = 'approve' THEN
    v_status := 'active';
    v_deleted_at := NULL;
  ELSE
    v_status := 'inactive';
    v_deleted_at := NOW();
  END IF;

  UPDATE public.memberships
  SET status = v_status, deleted_at = v_deleted_at
  WHERE id = v_membership.id
    AND status = 'pending'
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 1 THEN
    RETURN ROW(FALSE, 'conflict', v_membership.id, v_membership.neighborhood_id, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  RETURN ROW(TRUE, 'updated', v_membership.id, v_membership.neighborhood_id, v_status, v_deleted_at, v_count)::public.membership_moderation_result;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_pending_membership(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_pending_membership(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.moderate_pending_membership(UUID, TEXT) IS
  'Atomically approves or soft-declines a pending membership for an active neighborhood admin and returns an affected-row result independent of SELECT policy visibility.';
