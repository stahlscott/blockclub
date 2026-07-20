-- Session 5 database boundary inspection.
-- Run against the local database after `supabase db reset --local`.

DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM (VALUES
    ('public', 'idx_one_nonterminal_loan_per_item'),
    ('public', 'idx_loans_created_at')
  ) expected(schema_name, index_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_indexes i
    WHERE i.schemaname = expected.schema_name
      AND i.indexname = expected.index_name
  );
  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'required loan indexes are missing: %', missing_count;
  END IF;
END $$;

DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM (VALUES
    ('public', 'approve_loan', 'p_loan_id uuid'),
    ('public', 'activate_loan', 'p_loan_id uuid, p_start_date date, p_due_date date'),
    ('public', 'return_loan', 'p_loan_id uuid'),
    ('public', 'decline_loan', 'p_loan_id uuid'),
    ('public', 'cancel_loan', 'p_loan_id uuid'),
    ('public', 'move_out_membership', 'p_membership_id uuid'),
    ('public', 'soft_delete_item', 'p_item_id uuid'),
    ('public', 'soft_delete_post', 'p_post_id uuid')
  ) expected(schema_name, function_name, arguments)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = expected.schema_name
      AND p.proname = expected.function_name
      AND regexp_replace(pg_get_function_identity_arguments(p.oid), '\\s+', ' ', 'g') = expected.arguments
  );
  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'required boundary functions are missing: %', missing_count;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'loans'
      AND policyname = 'Owners can update loan status'
  ) THEN
    RAISE EXCEPTION 'deprecated broad loan update policy still exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('items', 'posts')
      AND cmd = 'DELETE'
      AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'ordinary authenticated hard-delete policy still exists';
  END IF;
END $$;

DO $$
DECLARE
  unauthorized_count integer;
BEGIN
  SELECT count(*) INTO unauthorized_count
  FROM information_schema.role_routine_grants
  WHERE routine_schema = 'public'
    AND routine_name IN ('staff_move_out_membership', 'staff_approve_loan', 'staff_activate_loan', 'staff_return_loan', 'staff_decline_loan', 'staff_cancel_loan', 'staff_membership_operation')
    AND grantee IN ('anon', 'authenticated', 'public');
  IF unauthorized_count <> 0 THEN
    RAISE EXCEPTION 'staff boundary function has browser/public grants: %', unauthorized_count;
  END IF;
END $$;

SELECT 'database boundary inspection passed' AS result;
