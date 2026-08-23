-- Migration: 04_backfill_conversations.sql
-- Description: Group pre-existing orphan task_jobs (created before conversations
--              existed) into per-(user, repo) threads so chat history shows up.

INSERT INTO public.conversations (user_id, repo_id, repo_name, title)
SELECT DISTINCT
    j.user_id,
    j.repo_id,
    r.repo_name,
    (
        SELECT j2.prompt
        FROM public.task_jobs j2
        WHERE j2.repo_id = j.repo_id
          AND j2.user_id = j.user_id
        ORDER BY j2.created_at ASC
        LIMIT 1
    ) AS title
FROM public.task_jobs j
JOIN public.repositories r ON r.id = j.repo_id
WHERE j.conversation_id IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.user_id = j.user_id
        AND c.repo_id IS NOT DISTINCT FROM j.repo_id
  );

UPDATE public.task_jobs j
SET conversation_id = c.id
FROM public.conversations c
WHERE c.user_id = j.user_id
  AND c.repo_id IS NOT DISTINCT FROM j.repo_id
  AND j.conversation_id IS NULL;
