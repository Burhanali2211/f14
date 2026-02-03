-- user_audio_files: Track user-uploaded audio files stored in R2
-- Idempotent: safe to run multiple times

-- Create table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_audio_files_user_id ON public.user_audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audio_files_piece_id ON public.user_audio_files(piece_id);
CREATE INDEX IF NOT EXISTS idx_user_audio_files_created_at ON public.user_audio_files(created_at DESC);

-- RLS
ALTER TABLE public.user_audio_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DROP POLICY IF EXISTS "Users can view own audio files" ON public.user_audio_files;
DROP POLICY IF EXISTS "Users can insert own audio files" ON public.user_audio_files;
DROP POLICY IF EXISTS "Users can delete own audio files" ON public.user_audio_files;
-- Users can only access their own audio files
CREATE POLICY "Users can view own audio files"
  ON public.user_audio_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio files"
  ON public.user_audio_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio files"
  ON public.user_audio_files FOR DELETE
  USING (auth.uid() = user_id);

