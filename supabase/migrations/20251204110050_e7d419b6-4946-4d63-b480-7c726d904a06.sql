-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'book',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pieces table
CREATE TABLE public.pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  reciter TEXT,
  language TEXT NOT NULL DEFAULT 'Urdu',
  text_content TEXT NOT NULL,
  audio_url TEXT,
  video_url TEXT,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for search
CREATE INDEX idx_pieces_title ON public.pieces USING gin(to_tsvector('simple', title));
CREATE INDEX idx_pieces_category ON public.pieces(category_id);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pieces ENABLE ROW LEVEL SECURITY;

-- Public read access for categories and pieces
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view pieces" ON public.pieces FOR SELECT USING (true);

-- Only authenticated users can modify (admin)
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pieces" ON public.pieces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pieces" ON public.pieces FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete pieces" ON public.pieces FOR DELETE TO authenticated USING (true);

-- Insert sample categories
INSERT INTO public.categories (name, slug, description, icon) VALUES
  ('Naat', 'naat', 'Praise poetry for Prophet Muhammad (PBUH)', 'heart'),
  ('Manqabat', 'manqabat', 'Poetry in praise of Ahlul Bayt and saints', 'star'),
  ('Noha', 'noha', 'Elegies mourning the martyrs of Karbala', 'droplet'),
  ('Dua', 'dua', 'Supplications and prayers', 'hand'),
  ('Marsiya', 'marsiya', 'Elegiac poetry commemorating Imam Hussain', 'moon'),
  ('Majlis', 'majlis', 'Religious gatherings and sermons', 'users');

-- Insert sample pieces
INSERT INTO public.pieces (title, category_id, reciter, language, text_content) VALUES
  ('Ya Nabi Salam Alayka', (SELECT id FROM public.categories WHERE slug = 'naat'), 'Maher Zain', 'Arabic',
   'یا نبی سلام علیک
یا رسول سلام علیک
یا حبیب سلام علیک
صلوات اللہ علیک

اشرق البدر علینا
فاختفت منہ البدور
مثل حسنک ما راینا
قط یا وجہ السرور

یا نبی سلام علیک
یا رسول سلام علیک'),
  ('Lab Pe Aati Hai Dua', (SELECT id FROM public.categories WHERE slug = 'dua'), 'Allama Iqbal', 'Urdu',
   'لب پہ آتی ہے دعا بن کے تمنا میری
زندگی شمع کی صورت ہو خدایا میری

دور دنیا کا مرے دم سے اندھیرا ہو جائے
ہر جگہ میرے چمکنے سے اجالا ہو جائے

ہو مرے دم سے یونہی میرے وطن کی زینت
جس طرح پھول سے ہوتی ہے چمن کی زینت

زندگی ہو مری پروانے کی صورت یا رب
علم کی شمع سے ہو مجھ کو محبت یا رب'),
  ('Salam Ya Hussain', (SELECT id FROM public.categories WHERE slug = 'noha'), 'Nadeem Sarwar', 'Urdu',
   'سلام یا حسین علیہ السلام
سلام اے شہید کربلا
سلام اے مظلوم نوا

تیری یاد میں آنسو بہتے ہیں
تیرے غم میں دل رو رہے ہیں
کربلا کی داستان سناتے ہیں
تیرا ماتم ہم مناتے ہیں

سلام یا حسین
سلام یا حسین');

-- Function to update view count
CREATE OR REPLACE FUNCTION public.increment_view_count(piece_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.pieces SET view_count = view_count + 1 WHERE id = piece_id;
END;
$$;