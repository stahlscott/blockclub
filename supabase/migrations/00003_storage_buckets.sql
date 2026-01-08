-- Front Porch Storage Buckets
-- For profile avatars and item images

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Avatars bucket for user profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,  -- Public so avatars can be displayed
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Items bucket for lending library item photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'items',
    'items',
    true,  -- Public so items can be displayed
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Avatars: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Avatars: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Avatars: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Avatars: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Items: Members can upload item photos (organized by neighborhood/item)
CREATE POLICY "Members can upload item photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'items'
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id::text = (storage.foldername(name))[1]
            AND i.owner_id = auth.uid()
        )
    );

-- Items: Owners can update item photos
CREATE POLICY "Owners can update item photos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'items'
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id::text = (storage.foldername(name))[1]
            AND i.owner_id = auth.uid()
        )
    );

-- Items: Owners can delete item photos
CREATE POLICY "Owners can delete item photos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'items'
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id::text = (storage.foldername(name))[1]
            AND i.owner_id = auth.uid()
        )
    );

-- Items: Anyone can view item photos (public bucket)
CREATE POLICY "Anyone can view item photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'items');
