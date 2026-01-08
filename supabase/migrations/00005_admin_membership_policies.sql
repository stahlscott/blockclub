-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can update neighborhoods" ON public.neighborhoods;
DROP POLICY IF EXISTS "Admins can update memberships" ON public.memberships;
DROP POLICY IF EXISTS "Admins can delete memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can delete own membership" ON public.memberships;

-- Allow admins to update neighborhoods
CREATE POLICY "Admins can update neighborhoods"
    ON public.neighborhoods FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.neighborhood_id = neighborhoods.id
            AND m.user_id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
        )
    );

-- Allow admins to update memberships (approve/reject)
CREATE POLICY "Admins can update memberships"
    ON public.memberships FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.neighborhood_id = memberships.neighborhood_id
            AND m.user_id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
        )
    );

-- Allow admins to delete memberships (reject requests, remove members)
CREATE POLICY "Admins can delete memberships"
    ON public.memberships FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.neighborhood_id = memberships.neighborhood_id
            AND m.user_id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
        )
    );

-- Allow users to delete their own membership (leave neighborhood)
CREATE POLICY "Users can delete own membership"
    ON public.memberships FOR DELETE
    USING (auth.uid() = user_id);
