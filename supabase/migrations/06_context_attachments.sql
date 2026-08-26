-- Migration: 06_context_attachments.sql
-- Description: Structured intent context (PRD §7.3) — optional file-path
--              reference, pasted error stack, and GitHub issue link folded
--              into the agent's initial prompt payload.

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS context_json JSONB;
