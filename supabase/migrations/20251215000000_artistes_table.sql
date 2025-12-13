-- Create artistes table for reciters/artists
CREATE TABLE IF NOT EXISTS public.artistes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artistes_name ON public.artistes(name);
CREATE INDEX IF NOT EXISTS idx_artistes_slug ON public.artistes(slug);

-- Enable RLS
ALTER TABLE public.artistes ENABLE ROW LEVEL SECURITY;

-- RLS policies for artistes
CREATE POLICY "Anyone can view artistes" ON public.artistes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert artistes" ON public.artistes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update artistes" ON public.artistes FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete artistes" ON public.artistes FOR DELETE USING (true);

-- Create storage bucket for artist images (optimized for small images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artist-images', 
  'artist-images', 
  true,
  1048576, -- 1MB limit for small artist images
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artist-images bucket
DROP POLICY IF EXISTS "Anyone can view artist images" ON storage.objects;
CREATE POLICY "Anyone can view artist images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-images');

DROP POLICY IF EXISTS "Authenticated users can upload artist images" ON storage.objects;
CREATE POLICY "Authenticated users can upload artist images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'artist-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update artist images" ON storage.objects;
CREATE POLICY "Authenticated users can update artist images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'artist-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete artist images" ON storage.objects;
CREATE POLICY "Authenticated users can delete artist images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'artist-images' AND auth.role() = 'authenticated');

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_artist_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Migrate existing reciters from pieces table to artistes table
INSERT INTO public.artistes (name, slug)
SELECT DISTINCT 
  reciter as name,
  generate_artist_slug(reciter) as slug
FROM public.pieces
WHERE reciter IS NOT NULL 
  AND reciter != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.artistes WHERE public.artistes.name = public.pieces.reciter
  )
ON CONFLICT (name) DO NOTHING;
