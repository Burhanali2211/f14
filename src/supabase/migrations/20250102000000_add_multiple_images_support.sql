-- Migration to support multiple images per recitation
-- Change image_url from TEXT to TEXT[] to support multiple images

-- First, convert existing single image_url values to arrays
-- This handles backward compatibility for existing data
UPDATE public.pieces 
SET image_url = ARRAY[image_url]::TEXT[]
WHERE image_url IS NOT NULL AND image_url != '';

-- Now alter the column type to TEXT[]
ALTER TABLE public.pieces 
ALTER COLUMN image_url TYPE TEXT[] USING 
  CASE 
    WHEN image_url IS NULL THEN NULL::TEXT[]
    WHEN image_url = '' THEN NULL::TEXT[]
    ELSE ARRAY[image_url]::TEXT[]
  END;

-- Add comment to document the change
COMMENT ON COLUMN public.pieces.image_url IS 'Array of image URLs for multi-page recitations. Can contain multiple images for recitations with more than one page.';

