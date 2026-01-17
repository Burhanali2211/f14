-- Add hero_image_url column to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.site_settings.hero_image_url IS 'URL to the hero section background image displayed behind the gradient on the homepage';
