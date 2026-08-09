-- Normalized image uploads are written only by the server-authoritative route.
-- Public reads remain enabled so existing JPEG/PNG/WebP/GIF objects continue to work.

UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/webp']::text[]
WHERE id IN ('avatars', 'items', 'posts');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own items folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own items folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from own items folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own posts folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from own posts folder" ON storage.objects;

-- The service-role client used by /api/uploads/images bypasses these policies.
-- Public SELECT policies are intentionally retained for legacy objects.
-- Do not COMMENT ON storage.objects here: the Storage system table is owned by
-- Supabase's internal role and application migrations cannot alter its metadata.
