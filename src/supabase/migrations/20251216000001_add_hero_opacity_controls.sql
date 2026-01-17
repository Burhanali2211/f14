-- Add opacity control columns to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_gradient_opacity NUMERIC(3,2) DEFAULT 1.0 CHECK (hero_gradient_opacity >= 0 AND hero_gradient_opacity <= 1);

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_image_opacity NUMERIC(3,2) DEFAULT 1.0 CHECK (hero_image_opacity >= 0 AND hero_image_opacity <= 1);

-- Add comments to the columns
COMMENT ON COLUMN public.site_settings.hero_gradient_opacity IS 'Opacity of the gradient overlay on hero section (0.0 to 1.0)';
COMMENT ON COLUMN public.site_settings.hero_image_opacity IS 'Opacity of the background image on hero section (0.0 to 1.0)';
