-- Add hero section customization columns to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_gradient_preset TEXT DEFAULT 'default' CHECK (hero_gradient_preset IN ('default', 'emerald', 'gold', 'purple', 'blue', 'minimal', 'none'));

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_badge_text TEXT DEFAULT 'Your Spiritual Companion';

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_heading_line1 TEXT DEFAULT 'Discover the Beauty of';

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_heading_line2 TEXT DEFAULT 'islamic poetry';

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_description TEXT DEFAULT 'Explore Naat, Manqabat, Noha, Dua, Marsiya, and more. Read, listen, and connect with your spiritual heritage.';

ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_text_color_mode TEXT DEFAULT 'auto' CHECK (hero_text_color_mode IN ('auto', 'light', 'dark'));

-- Add comments to the columns
COMMENT ON COLUMN public.site_settings.hero_gradient_preset IS 'Gradient preset style for hero section: default, emerald, gold, purple, blue, minimal, none';
COMMENT ON COLUMN public.site_settings.hero_badge_text IS 'Text displayed in the hero section badge';
COMMENT ON COLUMN public.site_settings.hero_heading_line1 IS 'First line of the hero section heading';
COMMENT ON COLUMN public.site_settings.hero_heading_line2 IS 'Second line of the hero section heading (with gradient)';
COMMENT ON COLUMN public.site_settings.hero_description IS 'Description text in the hero section';
COMMENT ON COLUMN public.site_settings.hero_text_color_mode IS 'Text color mode: auto (detects from image), light, or dark';
