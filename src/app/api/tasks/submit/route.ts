import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/crypto'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

const MAX_PROMPT_CHARS = 2000
/** Burst guard — submissions per user per rolling minute. */
const MAX_SUBMISSIONS_PER_MINUTE = 6
/** Backpressure — concurrent non-terminal jobs allowed per user. */
const MAX_ACTIVE_JOBS = 10

const MAX_FILE_PATH_CHARS = 512
const MAX_ERROR_STACK_CHARS = 4000

interface TaskContext {
  filePath?: string
  issueNumber?: number
  issueReference?: string | null
  errorStack?: string
}

/** Best-effort fetch of a GitHub issue's body so the agent gets real content,
 *  not just a number it cannot look up (the sandbox has no web access). */
async function resolveIssueContext(
  repoName: string,
  issueNumber: number,
  githubToken: string | null,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repoName}/issues/${issueNumber}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        },
        signal: AbortSignal.timeout(3000),
      },
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      title?: string
      body?: string
      html_url?: string
      state?: string
    }
    if (!data.title) return null
    const body = (data.body || '').slice(0, 1500)
    return [
      `GitHub issue #${issueNumber}${data.state ? ` (${data.state})` : ''}: ${data.title}`,
      data.html_url ? `(${data.html_url})` : '',
      body ? `\n${body}` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .trim()
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prompt, repoId, repoName, conversationId, startConversation, context } =
      (await request.json()) as {
        prompt?: string
        repoId?: string
        repoName?: string
        conversationId?: string
        startConversation?: boolean
        context?: {
          filePath?: string
          issueNumber?: number | string
          errorStack?: string
        }
      }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt intent is required' }, { status: 400 })
    }
    if (String(prompt).length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `Prompt exceeds the ${MAX_PROMPT_CHARS}-character limit` },
        { status: 400 },
      )
    }

    // Enforce WhatsApp deployment alert configuration (PRD §5.7, §7.7)
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('whatsapp_number')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!userSettings?.whatsapp_number?.trim()) {
      return NextResponse.json(
        {
          error: 'Please connect your WhatsApp number to receive deployment alerts before starting tasks.',
          requiresWhatsApp: true,
        },
        { status: 428 },
      )
    }

    // Normalize + validate optional context attachments (PRD §7.3).
    let taskContext: TaskContext | null = null
    if (context && typeof context === 'object') {
      const filePath = typeof context.filePath === 'string' ? context.filePath.trim().slice(0, MAX_FILE_PATH_CHARS) : ''
      const errorStack = typeof context.errorStack === 'string' ? context.errorStack.trim().slice(0, MAX_ERROR_STACK_CHARS) : ''
      const issueNumber = Number.parseInt(String(context.issueNumber ?? ''), 10)

      if (filePath || errorStack || Number.isFinite(issueNumber)) {
        taskContext = {
          ...(filePath ? { filePath } : {}),
          ...(Number.isFinite(issueNumber) && issueNumber > 0 ? { issueNumber } : {}),
          ...(errorStack ? { errorStack } : {}),
        }
      }
    }

    // Queue-level backpressure — protect the daemon from a runaway client.
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
    const [{ count: recentCount }, { count: activeCount }] = await Promise.all([
      supabase
        .from('task_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', oneMinuteAgo),
      supabase
        .from('task_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['queued', 'processing', 'verifying']),
    ])

    if ((recentCount ?? 0) >= MAX_SUBMISSIONS_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Slow down — too many tasks submitted in the last minute. Try again shortly.' },
        { status: 429 },
      )
    }
    if ((activeCount ?? 0) >= MAX_ACTIVE_JOBS) {
      return NextResponse.json(
        { error: `You already have ${activeCount} tasks in flight. Wait for one to finish first.` },
        { status: 429 },
      )
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

    // 2. Resolve the conversation this task belongs to.
    let resolvedConversationId: string | null = null

    if (conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .single()
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 403 })
      }
      resolvedConversationId = conv.id
    } else if (startConversation && (repoId || repoName)) {
      // First prompt of a fresh thread → spin up the conversation instantly so it
      // gets its own URL under the related repository.
      const title = String(prompt).trim().slice(0, 72)
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          repo_id: repoId || null,
          repo_name: repoName || null,
          title,
        })
        .select('id')
        .single()
      if (convError || !conv) {
        return NextResponse.json({ error: convError?.message || 'Failed to create conversation' }, { status: 500 })
      }
      resolvedConversationId = conv.id
    }

    // Resolve a linked GitHub issue into real content for the agent's prompt.
    // Best-effort: falls back to a plain "#N" reference when unreachable.
    if (taskContext?.issueNumber && repoName) {
      let githubToken: string | null = null
      try {
        const admin = createAdminClient()
        const { data: settings } = await admin
          .from('user_settings')
          .select('github_token')
          .eq('user_id', user.id)
          .single()
        const raw = settings?.github_token
        if (raw) githubToken = raw.startsWith('v1:') ? decryptSecret(raw) : raw
      } catch {
        /* token lookup is optional */
      }
      taskContext.issueReference =
        await resolveIssueContext(repoName, taskContext.issueNumber, githubToken)
    }

    // 3. Insert new task job record into Supabase (Status: queued)
    const { data: job, error: jobError } = await supabase
      .from('task_jobs')
      .insert({
        user_id: user.id,
        repo_id: repoId || null,
        prompt,
        status: 'queued',
        branch_name: `waycode/task-${Math.random().toString(36).substring(2, 8)}`,
        ...(resolvedConversationId ? { conversation_id: resolvedConversationId } : {}),
        ...(taskContext ? { context_json: taskContext } : {}),
      })
      .select()
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message || 'Failed to create job' }, { status: 500 })
    }

    if (resolvedConversationId) {
      // Bump the thread to the top of the sidebar.
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', resolvedConversationId)
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
      ...(taskContext ? { context: taskContext } : {}),
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
        conversationId: resolvedConversationId,
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
