-- Migration: 09_deploy_hooks.sql
-- Description: Platform-agnostic deployments — a per-repo outbound webhook
--              that WayCode POSTs right after landing approved changes
--              (Dokku / Coolify / CodePipeline / custom receiver), so VPS and
--              AWS targets get the same push-to-deploy treatment as Vercel.

ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS deploy_webhook_url TEXT;
