-- Migration: Characterization-driven RLS hardening
--
-- This migration closes the confirmed Phase 1 database findings before any
-- application mutation path relies on them. Policies are explicitly dropped
-- because PostgreSQL combines permissive policies; adding a narrower policy
-- beside a broad one would not restrict the broad policy.

-- Membership self-transitions: USING identifies the existing row that may be
-- changed; WITH CHECK preserves immutable identity/tenant fields and permits
-- only the intended status transition.
DROP POLICY IF EXISTS "Admins can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can move out own membership" ON public.memberships;
DROP POLICY IF EXISTS "Users can rejoin own membership" ON public.memberships;

CREATE POLICY "Admins can update memberships"
  ON public.memberships FOR UPDATE
  USING (
    is_neighborhood_admin(neighborhood_id, auth.uid())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    is_neighborhood_admin(neighborhood_id, auth.uid())
    AND user_id = memberships.user_id
    AND neighborhood_id = memberships.neighborhood_id
    AND role IN ('admin', 'member')
    AND (
      deleted_at IS NULL
      OR (status = 'inactive' AND deleted_at IS NOT NULL)
    )
  );

CREATE POLICY "Users can move out own membership"
  ON public.memberships FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'active'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'moved_out'
    AND deleted_at IS NULL
    AND role = memberships.role
    AND neighborhood_id = memberships.neighborhood_id
  );

CREATE POLICY "Users can rejoin own membership"
  ON public.memberships FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'moved_out'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('pending', 'active')
    AND deleted_at IS NULL
    AND role = memberships.role
    AND neighborhood_id = memberships.neighborhood_id
  );

-- Item UPDATEs may change circulation/content fields only. The owner and
-- neighborhood are immutable, and soft-deleted rows cannot be resurrected by
-- a direct browser write.
DROP POLICY IF EXISTS "Owners can update their items" ON public.items;
CREATE POLICY "Owners can update their items"
  ON public.items FOR UPDATE
  USING (
    auth.uid() = owner_id
    AND deleted_at IS NULL
    AND is_neighborhood_member(neighborhood_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = owner_id
    AND owner_id = items.owner_id
    AND neighborhood_id = items.neighborhood_id
    AND deleted_at IS NULL
    AND is_neighborhood_member(neighborhood_id, auth.uid())
  );

-- Loan INSERTs must be requested by a member for somebody else's item.
DROP POLICY IF EXISTS "Members can request loans" ON public.loans;
CREATE POLICY "Members can request loans"
  ON public.loans FOR INSERT
  WITH CHECK (
    auth.uid() = borrower_id
    AND status = 'requested'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_id
        AND i.owner_id <> auth.uid()
        AND i.deleted_at IS NULL
        AND is_neighborhood_member(i.neighborhood_id, auth.uid())
    )
  );

-- Remove the unrestricted owner UPDATE policy. The temporary characterization
-- boundary permits only owner approval requested→approved; activation/return
-- and relationship immutability move to named RPCs in the next migration.
DROP POLICY IF EXISTS "Owners can update loan status" ON public.loans;
CREATE POLICY "Owners can approve requested loans"
  ON public.loans FOR UPDATE
  USING (
    status = 'requested'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = loans.item_id
        AND i.owner_id = auth.uid()
        AND i.deleted_at IS NULL
    )
  )
  WITH CHECK (
    status = 'approved'
    AND item_id = loans.item_id
    AND borrower_id = loans.borrower_id
    AND deleted_at IS NULL
    AND returned_at IS NULL
    AND start_date IS NULL
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = loans.item_id
        AND i.owner_id = auth.uid()
        AND i.deleted_at IS NULL
    )
  );

COMMENT ON POLICY "Users can move out own membership" ON public.memberships IS
  'USING permits only an existing active self row; WITH CHECK preserves identity and permits only active→moved_out.';
COMMENT ON POLICY "Users can rejoin own membership" ON public.memberships IS
  'USING permits only an existing moved-out self row; WITH CHECK preserves identity and permits only moved_out→pending/active.';
COMMENT ON POLICY "Owners can approve requested loans" ON public.loans IS
  'Temporary characterization-safe approval policy; lifecycle RPCs will replace direct UPDATE access before production workflow changes.';
