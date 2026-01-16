-- SQL script to create the piece-images storage bucket
-- Run this in your Supabase SQL Editor (recommended method)
-- Go to: https://supabase.com/dashboard/project/_/sql/new

-- Create storage bucket for piece images
INSERT INTO storage.buckets (id, name, public)
VALUES ('piece-images', 'piece-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for piece-images bucket
-- Allow anyone to view images
DROP POLICY IF EXISTS "Anyone can view piece images" ON storage.objects;
CREATE POLICY "Anyone can view piece images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'piece-images');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload piece images" ON storage.objects;
CREATE POLICY "Authenticated users can upload piece images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'piece-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update images
DROP POLICY IF EXISTS "Authenticated users can update piece images" ON storage.objects;
CREATE POLICY "Authenticated users can update piece images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'piece-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete images
DROP POLICY IF EXISTS "Authenticated users can delete piece images" ON storage.objects;
CREATE POLICY "Authenticated users can delete piece images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'piece-images' AND auth.role() = 'authenticated');

