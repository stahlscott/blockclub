-- Migration: First Member Auto-Approve with AFTER INSERT Trigger
--
-- When a staff admin creates a neighborhood (without joining themselves), the first
-- user to join should be auto-approved as an active admin, even if the neighborhood
-- has require_approval=true.
--
-- Solution: Use an AFTER INSERT trigger that runs after RLS checks pass.
-- 1. App always inserts with status='pending' (passes RLS)
-- 2. Trigger updates to 'active' and promotes to 'admin' if first member
-- 3. For subsequent members, trigger auto-approves only if require_approval=false
--
-- The SECURITY DEFINER allows the trigger to bypass RLS for the UPDATE.

-- Create AFTER INSERT trigger function to auto-approve and promote memberships
CREATE OR REPLACE FUNCTION auto_approve_and_promote_membership()
RETURNS TRIGGER AS $$
DECLARE
    neighborhood_settings JSONB;
    active_member_count INTEGER;
    should_approve BOOLEAN := FALSE;
    should_promote_to_admin BOOLEAN := FALSE;
BEGIN
    -- Only process pending member inserts
    IF NEW.status = 'pending' AND NEW.role = 'member' THEN
        -- Count active members (excluding the just-inserted row)
        SELECT COUNT(*) INTO active_member_count
        FROM public.memberships
        WHERE neighborhood_id = NEW.neighborhood_id
        AND status = 'active'
        AND deleted_at IS NULL
        AND id != NEW.id;

        -- First member always gets auto-approved AND promoted to admin
        IF active_member_count = 0 THEN
            should_approve := TRUE;
            should_promote_to_admin := TRUE;
        ELSE
            -- Check neighborhood's require_approval setting
            SELECT settings INTO neighborhood_settings
            FROM public.neighborhoods
            WHERE id = NEW.neighborhood_id;

            -- Auto-approve if require_approval is false
            IF (neighborhood_settings->>'require_approval')::boolean IS FALSE THEN
                should_approve := TRUE;
            END IF;
        END IF;

        -- Update the membership if needed (SECURITY DEFINER bypasses RLS)
        IF should_approve THEN
            UPDATE public.memberships
            SET status = 'active',
                role = CASE WHEN should_promote_to_admin THEN 'admin'::membership_role ELSE role END
            WHERE id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the AFTER INSERT trigger
CREATE TRIGGER auto_approve_membership_trigger
    AFTER INSERT ON public.memberships
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_and_promote_membership();

-- Update the INSERT policy to only allow pending member inserts
-- (trigger handles promotion to active)
DROP POLICY IF EXISTS "Users can create membership" ON public.memberships;

CREATE POLICY "Users can create membership"
    ON public.memberships FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            -- Regular join request: pending member (trigger will promote if appropriate)
            (status = 'pending' AND role = 'member')
            OR
            -- Neighborhood creator adding themselves: active admin
            (status = 'active' AND role = 'admin' AND EXISTS (
                SELECT 1 FROM public.neighborhoods n
                WHERE n.id = neighborhood_id
                AND n.created_by = auth.uid()
            ))
        )
    );
