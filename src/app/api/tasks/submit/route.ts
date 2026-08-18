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

    // 1. Fetch user active AI Provider key & model settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const provider = settings?.provider || 'openrouter'
    const model = settings?.selected_model || 'google/gemini-2.0-flash-exp:free'
    const apiKey = settings?.api_key || ''

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
      message: `[QUEUED] Intent buffered into Redis queue for repository: ${repoName || 'Default'}`,
    })

    // 4. Push payload to Redis queue 'waycode:tasks'
    const payload = JSON.stringify({
      taskId: job.id,
      userId: user.id,
      repoName: repoName || 'Default',
      prompt,
      branchName: job.branch_name,
      provider,
      model,
      apiKey,
    })

    try {
      await redis.connect()
    } catch (e) {
      // Connect if disconnected
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
