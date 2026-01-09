-- Fix: Remove WITH CHECK from owner update policy
-- The WITH CHECK was causing issues with soft deletes even for owners
-- USING clause is sufficient to ensure only owners can update their items

DROP POLICY IF EXISTS "Owners can update their items" ON public.items;

CREATE POLICY "Owners can update their items"
    ON public.items FOR UPDATE
    USING (auth.uid() = owner_id);
