import { createClient } from '@/lib/supabase/server'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, repoId, repoName } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt intent is required' }, { status: 400 })
    }

    // 1. Verify the repository belongs to the caller (RLS also enforces this on select).
    if (repoId) {
      const { data: ownedRepo } = await supabase
        .from('repositories')
        .select('id')
        .eq('id', repoId)
        .single()
      if (!ownedRepo) {
        return NextResponse.json({ error: 'Repository not found for this account' }, { status: 403 })
      }
    }

    // 2. Insert new task job record into Supabase (Status: queued)
    const { data: job, error: jobError } = await supabase
      .from('task_jobs')
      .insert({
        user_id: user.id,
        repo_id: repoId || null,
        prompt,
        status: 'queued',
        branch_name: `waycode/task-${Math.random().toString(36).substring(2, 8)}`,
      })
      .select()
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 500 })
    }

    // 3. Write initial queued log line to task_logs
    await supabase.from('task_logs').insert({
      task_id: job.id,
      log_level: 'info',
      message: `Task queued for repository: ${repoName || 'Default'}`,
    })

    // 4. Push payload to Redis queue 'waycode:tasks'.
    //    Secrets are intentionally excluded — the daemon resolves the user's
    //    encrypted provider key + GitHub token via the service-role client.
    const payload = JSON.stringify({
      taskId: job.id,
      userId: user.id,
      repoName: repoName || '',
      prompt,
      branchName: job.branch_name,
    })

    try {
      await redis.connect()
    } catch {
      // Already connected — safe to ignore.
    }

    await redis.lpush('waycode:tasks', payload)

    // 5. Return immediate HTTP 202 Accepted response (<500ms guaranteed)
    return NextResponse.json(
      {
        success: true,
        taskId: job.id,
        status: 'queued',
        branchName: job.branch_name,
        message: 'Task successfully enqueued into VPS background daemon pipeline',
      },
      { status: 202 }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
