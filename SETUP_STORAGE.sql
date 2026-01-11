-- Setup Supabase Storage for Game Images
-- Run this in Supabase SQL Editor

-- Create storage bucket for game images
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-images', 'game-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy: Authenticated users can upload images
CREATE POLICY "Users can upload game images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-images');

-- Create storage policy: Anyone can view game images (public bucket)
CREATE POLICY "Anyone can view game images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'game-images');

-- Create storage policy: Users can delete their own images
CREATE POLICY "Users can delete own game images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'game-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'game-images';
