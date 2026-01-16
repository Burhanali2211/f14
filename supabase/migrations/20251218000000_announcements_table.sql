-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_created_at 
ON public.announcements(created_at DESC);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
-- Anyone can view announcements
CREATE POLICY "Anyone can view announcements" ON public.announcements
  FOR SELECT USING (true);

-- Only admins can create announcements
CREATE POLICY "Admins can create announcements" ON public.announcements
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update announcements
CREATE POLICY "Admins can update announcements" ON public.announcements
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- Only admins can delete announcements
CREATE POLICY "Admins can delete announcements" ON public.announcements
  FOR DELETE USING (public.is_admin(auth.uid()));
