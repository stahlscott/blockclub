-- Allow neighborhood admins to read profiles of users with pending memberships
-- This is needed so admins can see who is requesting to join their neighborhood

CREATE POLICY "Admins can read pending members profiles"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships admin_membership
            JOIN public.memberships pending_membership 
                ON admin_membership.neighborhood_id = pending_membership.neighborhood_id
            WHERE admin_membership.user_id = auth.uid()
            AND admin_membership.role = 'admin'
            AND admin_membership.status = 'active'
            AND admin_membership.deleted_at IS NULL
            AND pending_membership.user_id = users.id
            AND pending_membership.status = 'pending'
            AND pending_membership.deleted_at IS NULL
        )
    );
