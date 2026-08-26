-- Migration: 05_audit_and_retry.sql
-- Description: Human-review audit trail (who approved what, when) and the
--              rejection-retry linkage so a rejected task can re-queue as a
--              fresh job carrying reviewer feedback (PRD §10.2, §12.1).

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Links a retry attempt back to the rejected original.
ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS retry_of UUID REFERENCES public.task_jobs(id) ON DELETE SET NULL;

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

-- Rate-limit / burst queries filter by user + recency constantly.
CREATE INDEX IF NOT EXISTS idx_task_jobs_user_created
  ON public.task_jobs(user_id, created_at DESC);
