-- Migration: 08_daemon_heartbeat.sql
-- Description: Single-row liveness marker written by the agent daemon every
--              30s and read by /api/health. No public policies — the table is
--              service-role only by design.

CREATE TABLE IF NOT EXISTS public.daemon_status (
    id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
    last_beat TIMESTAMPTZ NOT NULL DEFAULT now(),
    version TEXT
);

ALTER TABLE public.daemon_status ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only SUPABASE_SERVICE_ROLE_KEY may read/write.
