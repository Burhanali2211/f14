-- Create site_settings table for configurable site information
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'Kalam Reader',
  site_tagline TEXT DEFAULT 'islamic poetry',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Ensure only one row exists
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Insert default settings
INSERT INTO public.site_settings (id, site_name, site_tagline, logo_url)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'Kalam Reader', 'islamic poetry', '/main.png')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view site settings
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can update site settings" ON public.site_settings
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_site_settings_updated_at();

