-- Fix bulletin board delete (soft-delete) policies
-- The original admin UPDATE policy didn't have an explicit WITH CHECK clause,
-- causing it to fail when setting deleted_at to a non-null value.

-- Drop the existing update policies
DROP POLICY IF EXISTS "Authors can update own posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Admins can update neighborhood posts" ON public.bulletin_posts;

-- Recreate author update policy (unchanged, but being explicit)
-- Authors can update their own non-deleted posts
CREATE POLICY "Authors can update own posts"
    ON public.bulletin_posts FOR UPDATE
    USING (auth.uid() = author_id AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = author_id);

-- Recreate admin update policy with explicit WITH CHECK
-- Admins can update any non-deleted post in their neighborhood (including soft-delete)
CREATE POLICY "Admins can update neighborhood posts"
    ON public.bulletin_posts FOR UPDATE
    USING (
        is_neighborhood_admin(neighborhood_id, auth.uid())
        AND deleted_at IS NULL
    )
    WITH CHECK (
        is_neighborhood_admin(neighborhood_id, auth.uid())
    );

-- Add policy for super admins (users who are members but may not be explicit admins)
-- This allows any active member to soft-delete their own posts via the author policy above,
-- and neighborhood admins to soft-delete any post via the admin policy above.
--
-- Note: Super admin handling is done at the application level via SUPER_ADMIN_EMAILS env var.
-- For database-level super admin support, we could add a super_admins table in the future.
