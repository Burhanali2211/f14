-- Fix the search path security issue
CREATE OR REPLACE FUNCTION public.increment_view_count(piece_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pieces SET view_count = view_count + 1 WHERE id = piece_id;
END;
$$;