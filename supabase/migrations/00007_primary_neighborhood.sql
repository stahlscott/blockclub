-- Add primary_neighborhood_id to track user's preferred neighborhood for unified dashboard
ALTER TABLE public.users 
ADD COLUMN primary_neighborhood_id uuid REFERENCES public.neighborhoods(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_users_primary_neighborhood ON public.users(primary_neighborhood_id);
