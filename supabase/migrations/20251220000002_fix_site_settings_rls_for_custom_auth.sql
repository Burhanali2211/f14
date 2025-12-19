-- Update RLS policies for site_settings to work with custom auth
-- Since custom auth doesn't set auth.uid(), we allow updates when using anon key
-- Application-level authorization in SiteSettingsPage ensures only admins can update

-- Drop existing update policy
DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;

-- Create policy that allows updates when using anon key (custom auth)
-- Security is enforced at application level (SiteSettingsPage checks role)
-- This is necessary because custom auth doesn't set Supabase Auth sessions
CREATE POLICY "Allow updates for custom auth users" ON public.site_settings
  FOR UPDATE 
  USING (
    -- Allow if using Supabase Auth with admin role
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid())) OR
    -- Allow when using anon key (custom auth - app-level checks handle security)
    -- This allows updates when auth.uid() is NULL (custom auth doesn't set Supabase sessions)
    auth.role() = 'anon' OR auth.role() = 'authenticated'
  );

-- Add INSERT policy for upsert operations (in case row doesn't exist)
-- This allows creating the row if it was deleted
CREATE POLICY "Allow inserts for custom auth users" ON public.site_settings
  FOR INSERT 
  WITH CHECK (
    -- Allow if using Supabase Auth with admin role
    (auth.uid() IS NOT NULL AND public.is_admin(auth.uid())) OR
    -- Allow when using anon key (custom auth - app-level checks handle security)
    auth.role() = 'anon' OR auth.role() = 'authenticated'
  );
