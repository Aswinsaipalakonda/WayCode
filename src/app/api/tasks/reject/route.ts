import { createClient } from '@/lib/supabase/server'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

const MAX_REASON_LENGTH = 1000

/**
 * Reject a reviewable task. With reviewer feedback (`reason`), the rejection
 * re-queues as a fresh PENDING job in the same thread whose prompt folds the
 * feedback into the agent's context — the PRD §10.2 retry flow.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId, reason }: { taskId?: string; reason?: string } = await request.json()
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const feedback = reason?.trim().slice(0, MAX_REASON_LENGTH) || null
    const wantsRetry = !!feedback

    // Ownership check — a user may only reject their own jobs.
    const { data: job, error: jobError } = await supabase
      .from('task_jobs')
      .select('id, user_id, status, prompt, repo_id, conversation_id, retry_count')
      .eq('id', taskId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!['verifying', 'build_verified'].includes((job.status as string) || '')) {
      return NextResponse.json(
        { error: `Task is not rejectable in state "${job.status}"` },
        { status: 409 },
      )
    }

    // Nothing was ever pushed during generation — rejection is purely a state
    // transition; the working branch only exists in the (already torn-down)
    // sandbox, so there is nothing to clean up on the remote.
    await supabase
      .from('task_jobs')
      .update({
        status: 'rejected',
        rejection_reason: feedback,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    await supabase.from('task_logs').insert({
      task_id: taskId,
      log_level: 'info',
      message: wantsRetry
        ? `[REJECTED] User rejected the diff. Nothing was pushed — a retry with reviewer feedback has been queued.`
        : `[REJECTED] User rejected the diff on review. Nothing was pushed.`,
    })

    if (!wantsRetry) {
      return NextResponse.json({ success: true, retried: false, message: 'Job rejected' })
    }

    // ---------- Retry path ----------
    // Resolve repo name for the daemon payload.
    let repoName = ''
    if (job.repo_id) {
      const { data: repo } = await supabase
        .from('repositories')
        .select('repo_name')
        .eq('id', job.repo_id)
        .single()
      repoName = repo?.repo_name ?? ''
    }
    if (!repoName) {
      return NextResponse.json(
        {
          success: true,
          retried: false,
          message: 'Job rejected, but its repository could not be resolved for an automatic retry.',
        },
        { status: 200 },
      )
    }

    // Fold the reviewer feedback into the agent's next-turn intent.
    const retryPrompt =
      `${job.prompt}\n\n` +
      `(Revised after human review) The previous diff was REJECTED by the developer with this feedback:\n` +
      `"${feedback}"\n` +
      `Produce a fresh implementation that addresses it.`

    const { data: retryJob, error: retryError } = await supabase
      .from('task_jobs')
      .insert({
        user_id: user.id,
        repo_id: job.repo_id,
        prompt: retryPrompt,
        status: 'queued',
        branch_name: `waycode/task-${Math.random().toString(36).substring(2, 8)}`,
        ...(job.conversation_id ? { conversation_id: job.conversation_id } : {}),
        retry_of: job.id,
        retry_count: ((job.retry_count as number) || 0) + 1,
      })
      .select('id, branch_name, prompt')
      .single()

    if (retryError || !retryJob) {
      return NextResponse.json(
        {
          success: true,
          retried: false,
          message: 'Job rejected, but queueing the retry attempt failed.',
        },
        { status: 200 },
      )
    }

    await supabase.from('task_logs').insert({
      task_id: retryJob.id,
      log_level: 'info',
      message: `Retry of rejected task ${taskId} — running again with reviewer feedback.`,
    })

    // Enqueue for the daemon — secrets stay out of Redis; the daemon
    // self-serves via the service-role client.
    try {
      await redis.connect()
    } catch {
      /* already connected */
    }
    await redis.lpush(
      'waycode:tasks',
      JSON.stringify({
        taskId: retryJob.id,
        userId: user.id,
        repoName,
        prompt: retryJob.prompt,
        branchName: retryJob.branch_name,
      }),
    )

    return NextResponse.json({
      success: true,
      retried: true,
      taskId: retryJob.id,
      branchName: retryJob.branch_name,
      prompt: retryJob.prompt,
      message: 'Job rejected and re-queued with your feedback.',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to reject task' }, { status: 500 })
  }
}
