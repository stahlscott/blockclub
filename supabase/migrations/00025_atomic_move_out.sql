-- Migration: Atomic ordinary-user move-out
--
-- Move-out is one transaction: membership transition, owned-item soft deletes,
-- and dependent loan closures either all commit or all roll back. History is
-- preserved; active loans are administratively returned with distinct audit
-- metadata.

CREATE TYPE public.move_out_result AS (
  success BOOLEAN,
  reason TEXT,
  membership_id UUID,
  affected_item_count INTEGER,
  cancelled_loan_count INTEGER,
  returned_loan_count INTEGER
);

CREATE OR REPLACE FUNCTION public.move_out_membership(p_membership_id UUID)
RETURNS public.move_out_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership public.memberships%ROWTYPE;
  v_item_count INTEGER := 0;
  v_cancelled_count INTEGER := 0;
  v_returned_count INTEGER := 0;
  v_item_ids UUID[];
BEGIN
  SELECT m.* INTO v_membership
  FROM public.memberships m
  WHERE m.id = p_membership_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN ROW(FALSE, 'not_authorized', NULL, 0, 0, 0)::public.move_out_result;
  END IF;

  -- Lock item rows before aggregating IDs; PostgreSQL does not allow FOR UPDATE
  -- directly on an aggregate query.
  PERFORM 1
  FROM public.items i
  WHERE i.owner_id = v_membership.user_id
    AND i.neighborhood_id = v_membership.neighborhood_id
    AND i.deleted_at IS NULL
  FOR UPDATE;

  SELECT COALESCE(array_agg(i.id), '{}') INTO v_item_ids
  FROM public.items i
  WHERE i.owner_id = v_membership.user_id
    AND i.neighborhood_id = v_membership.neighborhood_id
    AND i.deleted_at IS NULL;

  UPDATE public.memberships
  SET status = 'moved_out'
  WHERE id = v_membership.id AND status = 'active' AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN ROW(FALSE, 'conflict', v_membership.id, 0, 0, 0)::public.move_out_result;
  END IF;

  IF COALESCE(array_length(v_item_ids, 1), 0) > 0 THEN
    UPDATE public.items
    SET deleted_at = NOW()
    WHERE id = ANY(v_item_ids) AND deleted_at IS NULL;
    GET DIAGNOSTICS v_item_count = ROW_COUNT;

    UPDATE public.loans
    SET status = 'cancelled', closure_reason = 'administrative_move_out', closed_by_user_id = auth.uid()
    WHERE item_id = ANY(v_item_ids)
      AND deleted_at IS NULL
      AND status IN ('requested', 'approved');
    GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

    UPDATE public.loans
    SET status = 'returned', returned_at = NOW(), closure_reason = 'administrative_move_out', closed_by_user_id = auth.uid()
    WHERE item_id = ANY(v_item_ids)
      AND deleted_at IS NULL
      AND status = 'active';
    GET DIAGNOSTICS v_returned_count = ROW_COUNT;
  END IF;

  RETURN ROW(TRUE, 'updated', v_membership.id, v_item_count, v_cancelled_count, v_returned_count)::public.move_out_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.move_out_membership(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_out_membership(UUID) TO authenticated;
COMMENT ON FUNCTION public.move_out_membership(UUID) IS
  'Atomic ordinary self move-out. Preserves item/loan history; requested/approved loans cancel and active loans administratively return.';
