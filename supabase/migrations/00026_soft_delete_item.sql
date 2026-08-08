-- Migration: Atomic soft deletion of a library item
--
-- Ordinary item removal preserves the item and its loan history. The locked
-- operation cancels only requested/approved loans and refuses unresolved active
-- loans so item and loan state cannot diverge.

CREATE TYPE public.item_removal_result AS (
  success BOOLEAN,
  reason TEXT,
  item_id UUID,
  affected_item_count INTEGER,
  cancelled_loan_count INTEGER
);

CREATE OR REPLACE FUNCTION public.soft_delete_item(p_item_id UUID)
RETURNS public.item_removal_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.items%ROWTYPE;
  v_cancelled_count INTEGER := 0;
  v_item_count INTEGER := 0;
  v_open_loan_count INTEGER := 0;
BEGIN
  SELECT i.* INTO v_item
  FROM public.items i
  WHERE i.id = p_item_id
    AND i.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN ROW(FALSE, 'not_found', p_item_id, 0, 0)::public.item_removal_result;
  END IF;

  IF v_item.owner_id <> auth.uid()
     AND NOT public.is_neighborhood_admin(v_item.neighborhood_id, auth.uid()) THEN
    RETURN ROW(FALSE, 'not_authorized', v_item.id, 0, 0)::public.item_removal_result;
  END IF;

  -- Lock dependent live loans before checking or closing them. The item lock
  -- serializes this operation with lifecycle RPCs; these row locks make the
  -- dependent-state decision explicit and protect the all-or-nothing update.
  PERFORM 1
  FROM public.loans l
  WHERE l.item_id = v_item.id
    AND l.deleted_at IS NULL
  FOR UPDATE;

  SELECT COUNT(*) INTO v_open_loan_count
  FROM public.loans l
  WHERE l.item_id = v_item.id
    AND l.deleted_at IS NULL
    AND l.status = 'active';

  IF v_open_loan_count > 0 THEN
    RETURN ROW(FALSE, 'active_loan', v_item.id, 0, 0)::public.item_removal_result;
  END IF;

  UPDATE public.loans
  SET status = 'cancelled',
      closure_reason = 'administrative_item_removal',
      closed_by_user_id = auth.uid()
  WHERE item_id = v_item.id
    AND deleted_at IS NULL
    AND status IN ('requested', 'approved');
  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

  UPDATE public.items
  SET deleted_at = NOW()
  WHERE id = v_item.id
    AND deleted_at IS NULL;
  GET DIAGNOSTICS v_item_count = ROW_COUNT;

  IF v_item_count <> 1 THEN
    RETURN ROW(FALSE, 'conflict', v_item.id, 0, 0)::public.item_removal_result;
  END IF;

  RETURN ROW(TRUE, 'updated', v_item.id, v_item_count, v_cancelled_count)::public.item_removal_result;
END;
$$;

DROP POLICY IF EXISTS "Owners can delete their items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete neighborhood items" ON public.items;
REVOKE DELETE ON TABLE public.items FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.soft_delete_item(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_item(UUID) TO authenticated;

COMMENT ON FUNCTION public.soft_delete_item(UUID) IS
  'Atomically soft-deletes an item for its owner or active neighborhood admin. Refuses active loans and cancels requested/approved loans with administrative audit metadata.';
