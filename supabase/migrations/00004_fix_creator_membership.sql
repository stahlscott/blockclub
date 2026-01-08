-- Fix: Allow neighborhood creators to add themselves as admin members
-- The original policy only allowed inserting pending/member memberships

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can request membership" ON public.memberships;

-- Create a more flexible insert policy:
-- 1. Users can request to join any neighborhood (pending, member)
-- 2. Neighborhood creators can add themselves as admin (active, admin)
CREATE POLICY "Users can create membership"
    ON public.memberships FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            -- Regular join request: pending member
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
