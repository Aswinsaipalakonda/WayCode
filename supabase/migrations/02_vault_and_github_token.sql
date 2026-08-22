-- Migration: 02_vault_and_github_token.sql
-- Description: Extend user_settings with encrypted GitHub OAuth token storage
--              (server-side only, used by the daemon to clone/push/open PRs)
--              and connection-test audit columns per PRD §9.2.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS github_token TEXT;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS last_test_status TEXT;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMPTZ;
