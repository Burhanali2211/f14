-- Add user_id column to pieces table to track which uploader created each piece
ALTER TABLE public.pieces ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pieces_user_id ON public.pieces(user_id);

-- Update existing pieces to assign them to the first admin user (or null if no admin exists)
-- This is just for backward compatibility with existing data
UPDATE public.pieces 
SET user_id = (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1)
WHERE user_id IS NULL;
