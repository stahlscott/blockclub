-- Migration: Change items bucket storage policies from item-based to user-based folders
-- This allows users to upload photos during item creation (before item exists)
-- New path pattern: items/{user-id}/{filename} instead of items/{item-id}/{filename}

-- Drop existing item-based storage policies
DROP POLICY IF EXISTS "Members can upload item photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update item photos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete item photos" ON storage.objects;

-- Create new user-based folder policies
-- Users can upload to their own folder: items/{user-id}/{filename}
CREATE POLICY "Users can upload to own items folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'items'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own items folder"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'items'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete from own items folder"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'items'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Note: "Anyone can view item photos" policy remains unchanged (public read access)
