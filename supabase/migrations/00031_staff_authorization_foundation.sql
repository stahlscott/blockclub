-- Migration: Database-backed staff authorization foundation
--
-- STAFF_ADMIN_EMAILS remains a provisioning input, not a runtime authorization
-- source. The application provisions this allowlist with the service role via
-- scripts/sync-staff-admins.mjs. No RLS policy is created for this table:
-- service-role callers only may read or write it.

CREATE TABLE IF NOT EXISTS public.staff_admins (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_admins_active
  ON public.staff_admins(user_id)
  WHERE active;

ALTER TABLE public.staff_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_staff_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    p_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.staff_admins
      WHERE user_id = p_user_id
        AND active
    ),
    FALSE
  );
$$;

-- Staff operations are intentionally service-role-only. PostgREST requests
-- made with anon/authenticated JWTs have auth.uid() set, while service-role
-- requests have no end-user identity. The function still validates the staff
-- actor against the database allowlist and never trusts caller-selected audit
-- values without that validation.
CREATE OR REPLACE FUNCTION public.staff_moderate_pending_membership(
  p_membership_id UUID,
  p_effective_user_id UUID,
  p_staff_actor_id UUID,
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
  IF auth.uid() IS NOT NULL THEN
    RETURN ROW(FALSE, 'service_role_required', p_membership_id, NULL, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  IF p_membership_id IS NULL OR p_effective_user_id IS NULL OR p_staff_actor_id IS NULL THEN
    RETURN ROW(FALSE, 'missing_identity', p_membership_id, NULL, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  IF NOT public.is_staff_admin(p_staff_actor_id) THEN
    RETURN ROW(FALSE, 'staff_actor_not_allowlisted', p_membership_id, NULL, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  IF p_decision NOT IN ('approve', 'decline') THEN
    RETURN ROW(FALSE, 'invalid_decision', p_membership_id, NULL, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  SELECT m.* INTO v_membership
  FROM public.memberships AS m
  WHERE m.id = p_membership_id
    AND m.status = 'pending'
    AND m.deleted_at IS NULL
    AND public.is_neighborhood_admin(m.neighborhood_id, p_effective_user_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN ROW(FALSE, 'effective_user_not_authorized_or_conflict', p_membership_id, NULL, NULL, NULL, 0)::public.membership_moderation_result;
  END IF;

  IF p_decision = 'approve' THEN
    v_status := 'active';
    v_deleted_at := NULL;
  ELSE
    v_status := 'inactive';
    v_deleted_at := NOW();
  END IF;

  UPDATE public.memberships
  SET status = v_status,
      deleted_at = v_deleted_at,
      staff_actor_id = p_staff_actor_id
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

REVOKE ALL ON TABLE public.staff_admins FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.staff_admins TO service_role;
REVOKE ALL ON FUNCTION public.is_staff_admin(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.staff_moderate_pending_membership(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.staff_moderate_pending_membership(UUID, UUID, UUID, TEXT) TO service_role;

COMMENT ON TABLE public.staff_admins IS
  'Database-maintained staff allowlist. Provision with the service role from STAFF_ADMIN_EMAILS; never expose to browser roles.';
COMMENT ON FUNCTION public.is_staff_admin(UUID) IS
  'Returns true only for an active database allowlist row. Service-role execution is intentional.';
COMMENT ON FUNCTION public.staff_moderate_pending_membership(UUID, UUID, UUID, TEXT) IS
  'Service-role-only membership moderation. Validates allowlisted staff actor, effective neighborhood admin, target neighborhood, and audit attribution atomically.';
