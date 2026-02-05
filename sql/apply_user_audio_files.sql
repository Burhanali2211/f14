-- ============================================================
-- Apply user_audio_files table to Kalaam Reader Supabase project
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Create table for R2 audio file tracking
CREATE TABLE IF NOT EXISTS public.user_audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  duration_seconds NUMERIC(10,2),
  piece_id UUID REFERENCES public.pieces(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_audio_files_user_id ON public.user_audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audio_files_piece_id ON public.user_audio_files(piece_id);
CREATE INDEX IF NOT EXISTS idx_user_audio_files_created_at ON public.user_audio_files(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_audio_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe if re-running)
DROP POLICY IF EXISTS "Users can view own audio files" ON public.user_audio_files;
DROP POLICY IF EXISTS "Users can insert own audio files" ON public.user_audio_files;
DROP POLICY IF EXISTS "Users can delete own audio files" ON public.user_audio_files;

-- RLS policies: users access only their own rows
CREATE POLICY "Users can view own audio files"
  ON public.user_audio_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio files"
  ON public.user_audio_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio files"
  ON public.user_audio_files FOR DELETE
  USING (auth.uid() = user_id);
