-- Fix users table RLS for custom authentication
-- Since we're using custom auth (not Supabase Auth), we need to allow anon role access

-- First, check if RLS is enabled and disable it
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.users;
DROP POLICY IF EXISTS "Allow public read" ON public.users;
DROP POLICY IF EXISTS "Allow public write" ON public.users;

-- Create open policies since custom auth handles authorization at app level
CREATE POLICY "Allow public read on users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on users" ON public.users
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on users" ON public.users
  FOR DELETE USING (true);

-- Re-enable RLS with the new open policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Also fix uploader_permissions table
ALTER TABLE IF EXISTS public.uploader_permissions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own permissions" ON public.uploader_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.uploader_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.uploader_permissions;

CREATE POLICY "Allow public read on uploader_permissions" ON public.uploader_permissions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on uploader_permissions" ON public.uploader_permissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on uploader_permissions" ON public.uploader_permissions
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on uploader_permissions" ON public.uploader_permissions
  FOR DELETE USING (true);

ALTER TABLE public.uploader_permissions ENABLE ROW LEVEL SECURITY;

-- Also fix pieces table to allow uploaders to add recitations
DROP POLICY IF EXISTS "Admins can insert pieces" ON public.pieces;
DROP POLICY IF EXISTS "Admins can update pieces" ON public.pieces;
DROP POLICY IF EXISTS "Uploaders can update permitted pieces" ON public.pieces;
DROP POLICY IF EXISTS "Admins can delete pieces" ON public.pieces;
DROP POLICY IF EXISTS "Allow inserts for custom auth users" ON public.pieces;

CREATE POLICY "Allow public insert on pieces" ON public.pieces
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on pieces" ON public.pieces
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on pieces" ON public.pieces
  FOR DELETE USING (true);
