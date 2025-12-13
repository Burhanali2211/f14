-- Create figures table for personalities (Imam Ali, Imam Hassan, etc.)
CREATE TABLE public.figures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.figures ENABLE ROW LEVEL SECURITY;

-- RLS policies for figures
CREATE POLICY "Anyone can view figures" ON public.figures FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert figures" ON public.figures FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update figures" ON public.figures FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete figures" ON public.figures FOR DELETE USING (true);

-- Add figure_id and image_url to pieces table
ALTER TABLE public.pieces ADD COLUMN figure_id UUID REFERENCES public.figures(id) ON DELETE SET NULL;
ALTER TABLE public.pieces ADD COLUMN image_url TEXT;

-- Insert default figures
INSERT INTO public.figures (name, slug, description) VALUES
  ('Imam Ali (AS)', 'imam-ali', 'Commander of the Faithful'),
  ('Imam Hassan (AS)', 'imam-hassan', 'Second Imam'),
  ('Imam Hussain (AS)', 'imam-hussain', 'Master of Martyrs'),
  ('Prophet Muhammad (PBUH)', 'prophet-muhammad', 'The Last Prophet'),
  ('Bibi Fatima (SA)', 'bibi-fatima', 'Lady of the Worlds'),
  ('Imam Zain ul Abideen (AS)', 'imam-sajjad', 'Fourth Imam'),
  ('Imam Abbas (AS)', 'abbas-alamdar', 'Standard Bearer of Karbala'),
  ('General', 'general', 'General recitations');

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('piece-images', 'piece-images', true);

-- Storage policies
CREATE POLICY "Anyone can view piece images" ON storage.objects FOR SELECT USING (bucket_id = 'piece-images');
CREATE POLICY "Authenticated users can upload piece images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'piece-images');
CREATE POLICY "Authenticated users can update piece images" ON storage.objects FOR UPDATE USING (bucket_id = 'piece-images');
CREATE POLICY "Authenticated users can delete piece images" ON storage.objects FOR DELETE USING (bucket_id = 'piece-images');