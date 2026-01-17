-- Add hero Arabic font column to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_arabic_font TEXT DEFAULT 'noto-nastaliq' CHECK (hero_arabic_font IN ('noto-nastaliq', 'lateef', 'cairo', 'tajawal', 'amiri', 'noto-sans-arabic', 'ibm-plex-sans-arabic'));

-- Add comment to the column
COMMENT ON COLUMN public.site_settings.hero_arabic_font IS 'Font family for Arabic text in hero section: noto-nastaliq, lateef, cairo, tajawal, amiri, noto-sans-arabic, ibm-plex-sans-arabic';

