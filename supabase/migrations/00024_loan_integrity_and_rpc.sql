-- Migration: Loan integrity, lifecycle RPCs, and reservation serialization
--
-- This is the first authoritative loan lifecycle boundary. Direct browser UPDATE
-- policies are removed; authenticated callers use named functions that derive
-- auth.uid(), lock the item row, validate the current state, and update the
-- loan/item pair in one transaction.

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_by_user_id UUID REFERENCES public.users(id);

UPDATE public.loans
SET created_at = requested_at
WHERE created_at IS NULL;

ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_closure_reason_check,
  ADD CONSTRAINT loans_closure_reason_check CHECK (
    closure_reason IS NULL OR closure_reason IN (
      'borrower_returned',
      'borrower_cancelled',
      'owner_declined',
      'administrative_move_out',
      'administrative_item_removal',
      'staff_correction'
    )
  );

ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_terminal_fields_check,
  ADD CONSTRAINT loans_terminal_fields_check CHECK (
    (status = 'active' AND start_date IS NOT NULL)
    OR status <> 'active'
  ),
  ADD CONSTRAINT loans_returned_fields_check CHECK (
    (status = 'returned' AND returned_at IS NOT NULL)
    OR status <> 'returned'
  );

ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_item_id_fkey;
ALTER TABLE public.loans
  ADD CONSTRAINT loans_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE NO ACTION;

CREATE INDEX IF NOT EXISTS idx_loans_created_at ON public.loans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loans_closed_by_user ON public.loans(closed_by_user_id)
  WHERE closed_by_user_id IS NOT NULL;

-- At most one live reservation/loan may exist for an item. Requested and
-- approved remain visibly available, but reserve the item for that borrower.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_nonterminal_loan_per_item
  ON public.loans(item_id)
  WHERE deleted_at IS NULL AND status IN ('requested', 'approved', 'active');

CREATE OR REPLACE FUNCTION public.enforce_loan_row_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.item_id IS DISTINCT FROM OLD.item_id THEN
    RAISE EXCEPTION 'loan item relationship is immutable' USING ERRCODE = '22000';
  END IF;
  IF NEW.borrower_id IS DISTINCT FROM OLD.borrower_id THEN
    RAISE EXCEPTION 'loan borrower relationship is immutable' USING ERRCODE = '22000';
  END IF;
  IF OLD.status IN ('returned', 'cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'terminal loan status is immutable' USING ERRCODE = '22000';
  END IF;
  IF NEW.status = 'active' AND NEW.start_date IS NULL THEN
    RAISE EXCEPTION 'active loans require start_date' USING ERRCODE = '22000';
  END IF;
  IF NEW.status = 'returned' AND NEW.returned_at IS NULL THEN
    RAISE EXCEPTION 'returned loans require returned_at' USING ERRCODE = '22000';
  END IF;
  IF NEW.status IN ('returned', 'cancelled') AND NEW.closure_reason IS NULL THEN
    RAISE EXCEPTION 'terminal loans require closure_reason' USING ERRCODE = '22000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_loan_row_invariants ON public.loans;
CREATE TRIGGER enforce_loan_row_invariants
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_loan_row_invariants();

CREATE TYPE public.loan_operation_result AS (
  success BOOLEAN,
  reason TEXT,
  loan_id UUID,
  item_id UUID,
  affected_loan_count INTEGER,
  affected_item_count INTEGER
);

CREATE OR REPLACE FUNCTION public.loan_result(
  p_success BOOLEAN,
  p_reason TEXT,
  p_loan_id UUID DEFAULT NULL,
  p_item_id UUID DEFAULT NULL,
  p_loan_count INTEGER DEFAULT 0,
  p_item_count INTEGER DEFAULT 0
)
RETURNS public.loan_operation_result
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT p_success, p_reason, p_loan_id, p_item_id, p_loan_count, p_item_count;
$$;

CREATE OR REPLACE FUNCTION public.approve_loan(p_loan_id UUID)
RETURNS public.loan_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan public.loans%ROWTYPE;
BEGIN
  SELECT l.* INTO v_loan
  FROM public.loans l
  JOIN public.items i ON i.id = l.item_id
  WHERE l.id = p_loan_id
    AND l.deleted_at IS NULL
    AND i.deleted_at IS NULL
    AND i.owner_id = auth.uid()
  FOR UPDATE OF l;

  IF NOT FOUND THEN
    RETURN public.loan_result(FALSE, 'not_authorized');
  END IF;
  IF v_loan.status <> 'requested' THEN
    RETURN public.loan_result(FALSE, 'invalid_transition', v_loan.id, v_loan.item_id);
  END IF;

  UPDATE public.loans
  SET status = 'approved'
  WHERE id = v_loan.id AND status = 'requested' AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN public.loan_result(FALSE, 'conflict', v_loan.id, v_loan.item_id);
  END IF;
  RETURN public.loan_result(TRUE, 'updated', v_loan.id, v_loan.item_id, 1, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_loan(
  p_loan_id UUID,
  p_start_date DATE,
  p_due_date DATE DEFAULT NULL
)
RETURNS public.loan_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan public.loans%ROWTYPE;
  v_item public.items%ROWTYPE;
BEGIN
  SELECT i.* INTO v_item
  FROM public.items i
  JOIN public.loans l ON l.item_id = i.id
  WHERE l.id = p_loan_id AND l.deleted_at IS NULL AND i.deleted_at IS NULL
  FOR UPDATE OF i;

  IF NOT FOUND OR v_item.owner_id <> auth.uid() THEN
    RETURN public.loan_result(FALSE, 'not_authorized');
  END IF;

  SELECT l.* INTO v_loan FROM public.loans l
  WHERE l.id = p_loan_id AND l.item_id = v_item.id AND l.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN public.loan_result(FALSE, 'not_found', NULL, v_item.id);
  END IF;
  IF v_loan.status <> 'approved' THEN
    RETURN public.loan_result(FALSE, 'invalid_transition', v_loan.id, v_item.id);
  END IF;
  IF v_item.availability = 'unavailable' THEN
    RETURN public.loan_result(FALSE, 'conflict', v_loan.id, v_item.id);
  END IF;

  UPDATE public.loans
  SET status = 'active', start_date = p_start_date, due_date = p_due_date
  WHERE id = v_loan.id AND status = 'approved' AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN public.loan_result(FALSE, 'conflict', v_loan.id, v_item.id);
  END IF;
  UPDATE public.items SET availability = 'borrowed' WHERE id = v_item.id;
  RETURN public.loan_result(TRUE, 'updated', v_loan.id, v_item.id, 1, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.return_loan(p_loan_id UUID)
RETURNS public.loan_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loan public.loans%ROWTYPE;
  v_item public.items%ROWTYPE;
BEGIN
  SELECT i.* INTO v_item
  FROM public.items i JOIN public.loans l ON l.item_id = i.id
  WHERE l.id = p_loan_id AND l.deleted_at IS NULL AND i.deleted_at IS NULL
  FOR UPDATE OF i;
  IF NOT FOUND OR v_item.owner_id <> auth.uid() THEN
    RETURN public.loan_result(FALSE, 'not_authorized');
  END IF;

  SELECT l.* INTO v_loan FROM public.loans l
  WHERE l.id = p_loan_id AND l.item_id = v_item.id AND l.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN public.loan_result(FALSE, 'not_found', NULL, v_item.id); END IF;
  IF v_loan.status <> 'active' THEN
    RETURN public.loan_result(FALSE, 'invalid_transition', v_loan.id, v_item.id);
  END IF;

  UPDATE public.loans
  SET status = 'returned', returned_at = NOW(), closure_reason = 'borrower_returned', closed_by_user_id = auth.uid()
  WHERE id = v_loan.id AND status = 'active' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN public.loan_result(FALSE, 'conflict', v_loan.id, v_item.id); END IF;
  UPDATE public.items SET availability = 'available'
  WHERE id = v_item.id AND availability = 'borrowed';
  RETURN public.loan_result(TRUE, 'updated', v_loan.id, v_item.id, 1, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_loan(p_loan_id UUID)
RETURNS public.loan_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_loan public.loans%ROWTYPE;
BEGIN
  SELECT l.* INTO v_loan FROM public.loans l JOIN public.items i ON i.id = l.item_id
  WHERE l.id = p_loan_id AND l.deleted_at IS NULL AND i.deleted_at IS NULL AND i.owner_id = auth.uid()
  FOR UPDATE OF l;
  IF NOT FOUND THEN RETURN public.loan_result(FALSE, 'not_authorized'); END IF;
  IF v_loan.status <> 'requested' THEN RETURN public.loan_result(FALSE, 'invalid_transition', v_loan.id, v_loan.item_id); END IF;
  UPDATE public.loans SET status = 'cancelled', closure_reason = 'owner_declined', closed_by_user_id = auth.uid()
  WHERE id = v_loan.id AND status = 'requested' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN public.loan_result(FALSE, 'conflict', v_loan.id, v_loan.item_id); END IF;
  RETURN public.loan_result(TRUE, 'updated', v_loan.id, v_loan.item_id, 1, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_loan(p_loan_id UUID)
RETURNS public.loan_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_loan public.loans%ROWTYPE;
BEGIN
  SELECT l.* INTO v_loan FROM public.loans l
  WHERE l.id = p_loan_id AND l.deleted_at IS NULL AND l.borrower_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN public.loan_result(FALSE, 'not_authorized'); END IF;
  IF v_loan.status NOT IN ('requested', 'approved') THEN RETURN public.loan_result(FALSE, 'invalid_transition', v_loan.id, v_loan.item_id); END IF;
  UPDATE public.loans SET status = 'cancelled', closure_reason = 'borrower_cancelled', closed_by_user_id = auth.uid()
  WHERE id = v_loan.id AND status IN ('requested', 'approved') AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN public.loan_result(FALSE, 'conflict', v_loan.id, v_loan.item_id); END IF;
  RETURN public.loan_result(TRUE, 'updated', v_loan.id, v_loan.item_id, 1, 0);
END;
$$;

-- Lifecycle updates are RPC-only. The insert policy remains available for
-- ordinary request creation; all status transitions use the functions above.
DROP POLICY IF EXISTS "Owners can approve requested loans" ON public.loans;
DROP POLICY IF EXISTS "Borrowers can cancel own loans" ON public.loans;

REVOKE ALL ON FUNCTION public.loan_result(BOOLEAN, TEXT, UUID, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_loan_row_invariants() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_loan(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.activate_loan(UUID, DATE, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_loan(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_loan(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_loan(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_loan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_loan(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_loan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_loan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_loan(UUID) TO authenticated;

COMMENT ON FUNCTION public.approve_loan(UUID) IS 'Owner-only requested→approved transition; no item availability or start/due date mutation.';
COMMENT ON FUNCTION public.activate_loan(UUID, DATE, DATE) IS 'Owner-only approved→active transition; atomically sets start date and borrowed availability.';
COMMENT ON FUNCTION public.return_loan(UUID) IS 'Owner-only active→returned transition with closure audit and item availability update.';
COMMENT ON FUNCTION public.cancel_loan(UUID) IS 'Borrower-only requested/approved→cancelled transition.';
