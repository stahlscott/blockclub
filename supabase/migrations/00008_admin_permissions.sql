-- Admin permissions for item deletion
-- Allows neighborhood admins to delete any item in their neighborhood (for moderation)

CREATE POLICY "Admins can delete neighborhood items"
    ON public.items FOR DELETE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));
