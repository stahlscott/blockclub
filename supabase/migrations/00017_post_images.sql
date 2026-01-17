-- Add image_url column to posts
ALTER TABLE posts ADD COLUMN image_url TEXT;

-- Create posts storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts',
  'posts',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS policies for posts bucket

-- Users can upload to their own folder
CREATE POLICY "Users can upload to own posts folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Anyone can view post images (public bucket)
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'posts');

-- Users can delete from their own folder
CREATE POLICY "Users can delete from own posts folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);
