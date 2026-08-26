-- Migration: 07_push_and_whatsapp.sql
-- Description: Notification layer (PRD §5.7, §7.7) — web-push subscriptions
--              for review-ready/failed alerts and the user's WhatsApp number
--              for out-of-band deployment confirmations.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
    ON public.push_subscriptions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
