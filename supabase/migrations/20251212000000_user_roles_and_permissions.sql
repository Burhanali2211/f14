-- Create user_profiles table to store user roles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'uploader', 'user')),
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create uploader_permissions table to track what uploaders can access
-- Note: Foreign key to figures will be added if the table exists
CREATE TABLE IF NOT EXISTS public.uploader_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  figure_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category_id, figure_id)
);

-- Add foreign key to figures if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'figures') THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'uploader_permissions' 
      AND constraint_name = 'uploader_permissions_figure_id_fkey'
    ) THEN
      ALTER TABLE public.uploader_permissions
      ADD CONSTRAINT uploader_permissions_figure_id_fkey
      FOREIGN KEY (figure_id) REFERENCES public.figures(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_uploader_permissions_user ON public.uploader_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_uploader_permissions_category ON public.uploader_permissions(category_id);
CREATE INDEX IF NOT EXISTS idx_uploader_permissions_figure ON public.uploader_permissions(figure_id);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploader_permissions ENABLE ROW LEVEL SECURITY;

-- Function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role(user_id) = 'admin';
END;
$$;

-- Function to check if user is uploader
CREATE OR REPLACE FUNCTION public.is_uploader(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role(user_id) IN ('admin', 'uploader');
END;
$$;

-- Function to check if uploader has permission for category
CREATE OR REPLACE FUNCTION public.has_category_permission(user_id UUID, cat_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := public.get_user_role(user_id);
  
  -- Admins have all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Uploaders need explicit permission
  IF user_role = 'uploader' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.uploader_permissions
      WHERE uploader_permissions.user_id = has_category_permission.user_id
      AND uploader_permissions.category_id = cat_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to check if uploader has permission for figure
CREATE OR REPLACE FUNCTION public.has_figure_permission(user_id UUID, fig_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
  figures_exists BOOLEAN;
BEGIN
  -- Check if figures table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'figures'
  ) INTO figures_exists;
  
  -- If figures table doesn't exist, return true (no restrictions)
  IF NOT figures_exists THEN
    RETURN TRUE;
  END IF;
  
  user_role := public.get_user_role(user_id);
  
  -- Admins have all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Uploaders need explicit permission
  IF user_role = 'uploader' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.uploader_permissions
      WHERE uploader_permissions.user_id = has_figure_permission.user_id
      AND uploader_permissions.figure_id = fig_id
    );
  END IF;
  
  RETURN FALSE;
END;
$$;

-- RLS Policies for user_profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()));

-- Admins can insert and update any profile
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS Policies for uploader_permissions
-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" ON public.uploader_permissions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions" ON public.uploader_permissions
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Only admins can manage permissions
CREATE POLICY "Admins can manage permissions" ON public.uploader_permissions
  FOR ALL USING (public.is_admin(auth.uid()));

-- Update RLS policies for categories
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

-- Only admins and uploaders with permission can insert categories
CREATE POLICY "Admins and uploaders can insert categories" ON public.categories
  FOR INSERT WITH CHECK (public.is_uploader(auth.uid()));

-- Only admins can update/delete categories
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Update RLS policies for pieces
DROP POLICY IF EXISTS "Authenticated users can insert pieces" ON public.pieces;
DROP POLICY IF EXISTS "Authenticated users can update pieces" ON public.pieces;
DROP POLICY IF EXISTS "Authenticated users can delete pieces" ON public.pieces;

-- Admins can insert any piece
-- Uploaders can insert pieces only for categories/figures they have permission for
CREATE POLICY "Admins can insert pieces" ON public.pieces
  FOR INSERT WITH CHECK (
    public.is_admin(auth.uid()) OR
    (public.is_uploader(auth.uid()) AND 
     (public.has_category_permission(auth.uid(), category_id)) AND
     (figure_id IS NULL OR public.has_figure_permission(auth.uid(), figure_id)))
  );

-- Admins can update any piece
-- Uploaders can only update pieces they created (if we add created_by field) or have permission for
CREATE POLICY "Admins can update pieces" ON public.pieces
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Uploaders can update permitted pieces" ON public.pieces
  FOR UPDATE USING (
    public.is_uploader(auth.uid()) AND
    public.has_category_permission(auth.uid(), category_id) AND
    (figure_id IS NULL OR public.has_figure_permission(auth.uid(), figure_id))
  );

-- Only admins can delete pieces
CREATE POLICY "Admins can delete pieces" ON public.pieces
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Update RLS policies for figures (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'figures') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can insert figures" ON public.figures;
    DROP POLICY IF EXISTS "Authenticated users can update figures" ON public.figures;
    DROP POLICY IF EXISTS "Authenticated users can delete figures" ON public.figures;

    -- Only admins can manage figures
    CREATE POLICY "Admins can insert figures" ON public.figures
      FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

    CREATE POLICY "Admins can update figures" ON public.figures
      FOR UPDATE USING (public.is_admin(auth.uid()));

    CREATE POLICY "Admins can delete figures" ON public.figures
      FOR DELETE USING (public.is_admin(auth.uid()));
  END IF;
END $$;

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, full_name)
  VALUES (NEW.id, NEW.email, 'user', COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing users to have profiles (if any exist)
INSERT INTO public.user_profiles (id, email, role)
SELECT id, email, 'admin' -- Set first user as admin, you can change this
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
LIMIT 1;

