-- Add category_id to imams table for organizing Ahlulbayt by category
ALTER TABLE public.imams 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for better query performance (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_imams_category ON public.imams(category_id) WHERE category_id IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.imams.category_id IS 'Category to organize Ahlulbayt personalities for better sequencing and organization. When a category is deleted, imams in that category will have their category_id set to NULL.';

-- Create a helper function to get imams by category
CREATE OR REPLACE FUNCTION public.get_imams_by_category(cat_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    order_index INTEGER,
    category_id UUID,
    category_name TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.slug,
        i.title,
        i.description,
        i.image_url,
        i.order_index,
        i.category_id,
        c.name as category_name,
        i.created_at
    FROM public.imams i
    LEFT JOIN public.categories c ON i.category_id = c.id
    WHERE (cat_id IS NULL OR i.category_id = cat_id)
    ORDER BY 
        CASE WHEN i.category_id IS NULL THEN 1 ELSE 0 END, -- Uncategorized last
        c.name NULLS LAST, -- Category name
        i.order_index, -- Order index within category
        i.name; -- Name as final sort
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_imams_by_category(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_imams_by_category(UUID) TO anon;

-- Add helpful comment
COMMENT ON FUNCTION public.get_imams_by_category(UUID) IS 'Returns imams optionally filtered by category, with category name included. Uncategorized imams are returned last.';
