import { createAdminClient } from '@/lib/supabase/admin'
import { recordDeployEvent } from '@/lib/deploy-notify'
import { NextResponse } from 'next/server'

interface GenericDeployPayload {
  taskId?: string
  task_id?: string
  id?: string
  branch?: string
  branch_name?: string
  ref?: string
  status?: string
  state?: string
  result?: string
  success?: boolean
  url?: string
  deploymentUrl?: string
  liveUrl?: string
  source?: string
  provider?: string
  message?: string
  error?: string
}

const SUCCESS_STATES = new Set([
  'success',
  'succeeded',
  'ready',
  'completed',
  'ok',
  'deployed',
  'passed',
])

const FAILURE_STATES = new Set([
  'error',
  'failed',
  'failure',
  'canceled',
  'cancelled',
  'timed_out',
])

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const rawSecret = process.env.DEPLOY_WEBHOOK_SECRET

    // Optional secret verification
    if (rawSecret) {
      const headerSecret =
        request.headers.get('x-waycode-secret') ||
        request.headers.get('x-webhook-secret') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      const querySecret = url.searchParams.get('secret') || url.searchParams.get('token')

      if (headerSecret !== rawSecret && querySecret !== rawSecret) {
        return NextResponse.json({ error: 'Unauthorized: invalid webhook secret' }, { status: 401 })
      }
    }

    let payload: GenericDeployPayload = {}
    try {
      payload = (await request.json()) as GenericDeployPayload
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const taskId = payload.taskId || payload.task_id || payload.id || url.searchParams.get('taskId')
    let branch = payload.branch || payload.branch_name || payload.ref || url.searchParams.get('branch') || ''
    if (branch.startsWith('refs/heads/')) {
      branch = branch.replace('refs/heads/', '')
    }

    const supabase = createAdminClient()
    let job: { id: string; user_id: string; prompt?: string | null; branch_name?: string | null } | null = null

    if (taskId) {
      const { data } = await supabase
        .from('task_jobs')
        .select('id, user_id, prompt, branch_name')
        .eq('id', taskId)
        .maybeSingle()
      job = data
    }

    if (!job && branch) {
      const { data } = await supabase
        .from('task_jobs')
        .select('id, user_id, prompt, branch_name')
        .eq('branch_name', branch)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      job = data
    }

    if (!job) {
      return NextResponse.json({ ok: true, ignored: 'no-matching-task' }, { status: 404 })
    }

    // Determine status
    let isSuccess = true
    if (typeof payload.success === 'boolean') {
      isSuccess = payload.success
    } else {
      const stateStr = (payload.status || payload.state || payload.result || 'success').toLowerCase()
      if (FAILURE_STATES.has(stateStr)) {
        isSuccess = false
      } else if (SUCCESS_STATES.has(stateStr)) {
        isSuccess = true
      }
    }

    const liveUrl = payload.url || payload.deploymentUrl || payload.liveUrl || null
    const source = payload.source || payload.provider || 'Deploy Webhook'
    const customMessage = payload.message || payload.error || null

    await recordDeployEvent(
      supabase,
      { id: job.id, user_id: job.user_id, prompt: job.prompt },
      {
        success: isSuccess,
        source,
        url: liveUrl,
        message: customMessage,
      },
    )

    return NextResponse.json({
      success: true,
      handled: isSuccess ? 'deployed' : 'deploy-failed',
      taskId: job.id,
      branch: job.branch_name,
    })
  } catch (err: unknown) {
    console.error('[Deploy Inbound Webhook] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
