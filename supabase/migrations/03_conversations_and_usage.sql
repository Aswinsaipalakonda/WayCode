-- Migration: 03_conversations_and_usage.sql
-- Description: Per-repo conversation threads with unique URLs + AI token
--              usage accounting per task.

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
    repo_name TEXT,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER;

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER;

ALTER TABLE public.task_jobs
  ADD COLUMN IF NOT EXISTS model_used TEXT;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations"
    ON public.conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_repo
  ON public.conversations(user_id, repo_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_jobs_conversation
  ON public.task_jobs(conversation_id, created_at);
