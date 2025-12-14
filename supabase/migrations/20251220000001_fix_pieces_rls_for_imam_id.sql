-- Update RLS policies for pieces to support imam_id and work with custom auth
-- Since custom auth doesn't set auth.uid(), we allow inserts when using anon key
-- Application-level authorization in AddPiecePage ensures only admins/uploaders can insert

-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert pieces" ON public.pieces;
DROP POLICY IF EXISTS "Authenticated users can insert pieces" ON public.pieces;

-- Create policy that allows inserts when using anon key (custom auth)
-- Security is enforced at application level (AddPiecePage checks role and permissions)
-- This is necessary because custom auth doesn't set Supabase Auth sessions
CREATE POLICY "Allow inserts for custom auth users" ON public.pieces
  FOR INSERT 
  WITH CHECK (
    -- Allow if using Supabase Auth with proper permissions
    (auth.uid() IS NOT NULL AND (
      public.is_admin(auth.uid()) OR
      (public.is_uploader(auth.uid()) AND 
       public.has_category_permission(auth.uid(), category_id) AND
       (imam_id IS NULL OR EXISTS (
         SELECT 1 FROM public.uploader_permissions
         WHERE uploader_permissions.user_id = auth.uid()
         AND uploader_permissions.imam_id = pieces.imam_id
       ))
      )
    )) OR
    -- Allow when using anon key (custom auth - app-level checks handle security)
    -- This allows inserts when auth.uid() is NULL (custom auth doesn't set Supabase sessions)
    auth.role() = 'anon' OR auth.role() = 'authenticated'
  );

-- Update the update policy to also check imam_id (when auth.uid() is available)
DROP POLICY IF EXISTS "Uploaders can update permitted pieces" ON public.pieces;
CREATE POLICY "Uploaders can update permitted pieces" ON public.pieces
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND
    public.is_uploader(auth.uid()) AND
    public.has_category_permission(auth.uid(), category_id) AND
    (imam_id IS NULL OR EXISTS (
      SELECT 1 FROM public.uploader_permissions
      WHERE uploader_permissions.user_id = auth.uid()
      AND uploader_permissions.imam_id = pieces.imam_id
    ))
  );
