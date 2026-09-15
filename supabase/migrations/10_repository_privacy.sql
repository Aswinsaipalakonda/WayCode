-- Migration: 10_repository_privacy.sql
-- Description: Track GitHub repository privacy status (public vs private) dynamically

ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_repositories_user_privacy
  ON public.repositories(user_id, is_private);
