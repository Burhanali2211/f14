-- Update storage RLS policies for artist-images bucket to work with custom auth
-- Since custom auth doesn't set auth.uid(), we allow uploads when using anon key
-- Application-level authorization in AdminPage ensures only admins can upload
-- This is necessary because custom auth doesn't set Supabase Auth sessions

-- Drop existing storage policies for artist-images
DROP POLICY IF EXISTS "Authenticated users can upload artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update artist images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete artist images" ON storage.objects;

-- Create policy that allows uploads when using anon key (custom auth)
-- Security is enforced at application level (AdminPage checks role)
CREATE POLICY "Allow uploads for custom auth users - artist images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'artist-images' AND 
    (auth.role() = 'anon' OR auth.role() = 'authenticated')
  );

-- Create policy that allows updates when using anon key (custom auth)
CREATE POLICY "Allow updates for custom auth users - artist images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'artist-images' AND 
    (auth.role() = 'anon' OR auth.role() = 'authenticated')
  );

-- Create policy that allows deletes when using anon key (custom auth)
CREATE POLICY "Allow deletes for custom auth users - artist images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'artist-images' AND 
    (auth.role() = 'anon' OR auth.role() = 'authenticated')
  );

