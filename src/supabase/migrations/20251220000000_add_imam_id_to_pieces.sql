-- Add imam_id column to pieces table to reference imams table
-- This allows pieces to be associated with Ahlulbayt personalities (imams)
ALTER TABLE public.pieces 
ADD COLUMN IF NOT EXISTS imam_id UUID REFERENCES public.imams(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pieces_imam ON public.pieces(imam_id) WHERE imam_id IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.pieces.imam_id IS 'Reference to imams table for Ahlulbayt personalities. When an imam is deleted, pieces referencing that imam will have their imam_id set to NULL.';
