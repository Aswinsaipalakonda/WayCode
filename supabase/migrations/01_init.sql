-- Migration: 01_init.sql
-- Description: Initialize core schema for WayCode BaaS (user_settings, repositories, task_jobs, task_logs)

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. user_settings: User BYOK provider configuration
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    provider TEXT NOT NULL DEFAULT 'openrouter',
    api_key TEXT,
    selected_model TEXT NOT NULL DEFAULT 'google/gemini-2.0-flash-exp:free',
    custom_base_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. repositories: Track user's connected GitHub repositories
CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    connection_state TEXT NOT NULL DEFAULT 'connected',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, repo_name)
);

-- 3. task_jobs: Task queue state machine
CREATE TABLE IF NOT EXISTS public.task_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    repo_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, verifying, completed, failed, rejected
    diff_content TEXT,
    branch_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. task_logs: Realtime append-only telemetry logs
CREATE TABLE IF NOT EXISTS public.task_logs (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.task_jobs(id) ON DELETE CASCADE,
    log_level TEXT NOT NULL DEFAULT 'info', -- info, tool_call, syntax_check, error
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: user_settings
CREATE POLICY "Users can manage their own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies: repositories
CREATE POLICY "Users can manage their own repositories"
    ON public.repositories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies: task_jobs
CREATE POLICY "Users can manage their own task jobs"
    ON public.task_jobs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies: task_logs
CREATE POLICY "Users can view logs for their own task jobs"
    ON public.task_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.task_jobs
            WHERE task_jobs.id = task_logs.task_id
            AND task_jobs.user_id = auth.uid()
        )
    );

-- Realtime Publication for CDC
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_logs;
