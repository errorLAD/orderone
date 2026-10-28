-- Migration: Create uploaded_media table to persist images and files directly in Supabase PostgreSQL
-- Eliminates serverless EROFS read-only filesystem errors on Vercel and AWS Lambda

CREATE TABLE IF NOT EXISTS public.uploaded_media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  folder TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_media_filename ON public.uploaded_media (filename);
CREATE INDEX IF NOT EXISTS idx_uploaded_media_folder_filename ON public.uploaded_media (folder, filename);
