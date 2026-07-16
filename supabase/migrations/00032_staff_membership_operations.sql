-- Migration: Staff membership command boundary
-- All staff membership mutations use this service-role-only command. Ordinary
-- browser roles cannot invoke it and no operation hard-deletes membership rows.

CREATE TYPE public.staff_membership_operation_result AS (
  success BOOLEAN,
  reason TEXT,
  membership_id UUID,
  user_id UUID,
  neighborhood_id UUID,
  role public.membership_role,
  status public.membership_status,
  deleted_at TIMESTAMPTZ,
  affected_membership_count INTEGER
);

CREATE OR REPLACE FUNCTION public.staff_membership_operation(
  p_operation TEXT,
  p_membership_id UUID DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_neighborhood_id UUID DEFAULT NULL,
  p_role public.membership_role DEFAULT NULL,
  p_staff_actor_id UUID DEFAULT NULL
)
RETURNS public.staff_membership_operation_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership public.memberships%ROWTYPE;
  v_membership_id UUID;
  v_status public.membership_status;
  v_role public.membership_role;
  v_deleted_at TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RETURN ROW(FALSE, 'service_role_required', p_membership_id, NULL, NULL, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
  END IF;

  IF p_staff_actor_id IS NULL THEN
    RETURN ROW(FALSE, 'missing_staff_actor', p_membership_id, NULL, NULL, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
  END IF;

  IF NOT public.is_staff_admin(p_staff_actor_id) THEN
    RETURN ROW(FALSE, 'staff_actor_not_allowlisted', p_membership_id, NULL, NULL, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
  END IF;

  IF p_operation NOT IN ('approve', 'decline', 'remove', 'reactivate', 'promote', 'demote', 'add') THEN
    RETURN ROW(FALSE, 'invalid_operation', p_membership_id, NULL, NULL, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
  END IF;

  IF p_operation = 'add' THEN
    IF p_target_user_id IS NULL OR p_neighborhood_id IS NULL THEN
      RETURN ROW(FALSE, 'missing_target', NULL, p_target_user_id, p_neighborhood_id, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_target_user_id)
       OR NOT EXISTS (SELECT 1 FROM public.neighborhoods WHERE id = p_neighborhood_id) THEN
      RETURN ROW(FALSE, 'target_not_found', NULL, p_target_user_id, p_neighborhood_id, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.memberships
      WHERE user_id = p_target_user_id AND neighborhood_id = p_neighborhood_id
    ) THEN
      RETURN ROW(FALSE, 'membership_exists', NULL, p_target_user_id, p_neighborhood_id, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
    END IF;

    INSERT INTO public.memberships (user_id, neighborhood_id, role, status, deleted_at, staff_actor_id)
    VALUES (p_target_user_id, p_neighborhood_id, COALESCE(p_role, 'member'), 'active', NULL, p_staff_actor_id)
    RETURNING id, user_id, neighborhood_id, role, status, deleted_at
    INTO v_membership_id, v_membership.user_id, v_membership.neighborhood_id, v_role, v_status, v_deleted_at;

    RETURN ROW(TRUE, 'created', v_membership_id, v_membership.user_id, v_membership.neighborhood_id, v_role, v_status, v_deleted_at, 1)::public.staff_membership_operation_result;
  END IF;

  IF p_membership_id IS NULL THEN
    RETURN ROW(FALSE, 'missing_membership', NULL, NULL, NULL, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
  END IF;

  SELECT m.* INTO v_membership
  FROM public.memberships AS m
  WHERE m.id = p_membership_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN ROW(FALSE, 'membership_not_found', p_membership_id, NULL, NULL, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
  END IF;

  IF p_operation = 'approve' THEN
    IF v_membership.status <> 'pending' OR v_membership.deleted_at IS NOT NULL THEN
      RETURN ROW(FALSE, 'invalid_state', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_membership.role, v_membership.status, v_membership.deleted_at, 0)::public.staff_membership_operation_result;
    END IF;
    v_status := 'active'; v_role := v_membership.role; v_deleted_at := NULL;
  ELSIF p_operation = 'decline' THEN
    IF v_membership.status <> 'pending' OR v_membership.deleted_at IS NOT NULL THEN
      RETURN ROW(FALSE, 'invalid_state', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_membership.role, v_membership.status, v_membership.deleted_at, 0)::public.staff_membership_operation_result;
    END IF;
    v_status := 'inactive'; v_role := v_membership.role; v_deleted_at := NOW();
  ELSIF p_operation = 'remove' THEN
    IF v_membership.deleted_at IS NOT NULL OR v_membership.status = 'inactive' THEN
      RETURN ROW(FALSE, 'already_removed', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_membership.role, v_membership.status, v_membership.deleted_at, 0)::public.staff_membership_operation_result;
    END IF;
    v_status := 'inactive'; v_role := v_membership.role; v_deleted_at := NOW();
  ELSIF p_operation = 'reactivate' THEN
    IF v_membership.deleted_at IS NULL OR v_membership.status <> 'inactive' THEN
      RETURN ROW(FALSE, 'invalid_state', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_membership.role, v_membership.status, v_membership.deleted_at, 0)::public.staff_membership_operation_result;
    END IF;
    v_status := 'active'; v_role := COALESCE(p_role, v_membership.role); v_deleted_at := NULL;
  ELSE
    IF v_membership.deleted_at IS NOT NULL OR v_membership.status <> 'active' THEN
      RETURN ROW(FALSE, 'invalid_state', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_membership.role, v_membership.status, v_membership.deleted_at, 0)::public.staff_membership_operation_result;
    END IF;
    IF p_operation = 'promote' THEN
      IF v_membership.role <> 'member' THEN
        RETURN ROW(FALSE, 'invalid_state', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_membership.role, v_membership.status, v_membership.deleted_at, 0)::public.staff_membership_operation_result;
      END IF;
      v_role := 'admin';
    ELSE
      IF v_membership.role <> 'admin' THEN
        RETURN ROW(FALSE, 'invalid_state', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_membership.role, v_membership.status, v_membership.deleted_at, 0)::public.staff_membership_operation_result;
      END IF;
      v_role := 'member';
    END IF;
    v_status := v_membership.status; v_deleted_at := v_membership.deleted_at;
  END IF;

  UPDATE public.memberships
  SET status = v_status, role = v_role, deleted_at = v_deleted_at, staff_actor_id = p_staff_actor_id
  WHERE id = v_membership.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 1 THEN
    RETURN ROW(FALSE, 'conflict', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, NULL, NULL, NULL, 0)::public.staff_membership_operation_result;
  END IF;

  RETURN ROW(TRUE, 'updated', v_membership.id, v_membership.user_id, v_membership.neighborhood_id, v_role, v_status, v_deleted_at, v_count)::public.staff_membership_operation_result;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_membership_operation(TEXT, UUID, UUID, UUID, public.membership_role, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_membership_operation(TEXT, UUID, UUID, UUID, public.membership_role, UUID) TO service_role;

COMMENT ON FUNCTION public.staff_membership_operation(TEXT, UUID, UUID, UUID, public.membership_role, UUID) IS
  'Service-role-only staff membership command. Approve, decline, remove, reactivate, promote, demote, and add preserve identity/tenant fields, soft-delete removals, and record staff_actor_id.';
