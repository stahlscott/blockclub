-- Allow admins to update (soft delete) items in their neighborhood
CREATE POLICY "Admins can update neighborhood items"
    ON public.items FOR UPDATE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));
