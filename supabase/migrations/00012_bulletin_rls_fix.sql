-- Fix bulletin board UPDATE policies for soft-delete
-- The previous policies had `deleted_at IS NULL` in the USING clause,
-- which fails when trying to SET deleted_at (soft-delete) because
-- PostgreSQL re-evaluates the row against USING after the update.

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Authors can update own posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Admins can update neighborhood posts" ON public.bulletin_posts;

-- Authors can update their own posts (no deleted_at check - SELECT policy handles visibility)
CREATE POLICY "Authors can update own posts"
    ON public.bulletin_posts FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Admins can update any post in their neighborhood
CREATE POLICY "Admins can update neighborhood posts"
    ON public.bulletin_posts FOR UPDATE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()))
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));
