import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordDeployEvent } from '@/lib/deploy-notify'
import { NextResponse } from 'next/server'

const SUCCESS_EVENTS = new Set(['deployment.succeeded', 'deployment.ready'])
const FAILURE_EVENTS = new Set(['deployment.error', 'deployment.canceled'])

interface VercelWebhookBody {
  type?: string
  payload?: {
    name?: string
    target?: string | null
    deployment?: {
      url?: string
      meta?: {
        githubCommitRef?: string
        githubCommitSha?: string
        githubOrg?: string
        githubRepo?: string
      }
    }
    links?: { deployment?: string }
  }
}

function liveUrl(body: VercelWebhookBody): string | null {
  const raw = body.payload?.deployment?.url
  if (!raw) return body.payload?.links?.deployment ?? null
  return raw.startsWith('http') ? raw : `https://${raw}`
}

export async function POST(request: Request) {
  try {
    const raw = await request.text()

    // Signature check — Vercel signs webhooks with HMAC-SHA1 of the raw body.
    const secret = process.env.VERCEL_WEBHOOK_SECRET
    if (secret) {
      const signature = request.headers.get('x-vercel-signature') || ''
      const expected = crypto.createHmac('sha1', secret).update(raw).digest('hex')
      const a = Buffer.from(signature)
      const b = Buffer.from(expected)
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.warn('[Vercel Webhook] VERCEL_WEBHOOK_SECRET not set — skipping signature check.')
    }

    let body: VercelWebhookBody
    try {
      body = JSON.parse(raw) as VercelWebhookBody
    } catch {
      return NextResponse.json({ ok: true, ignored: 'unparseable' })
    }

    // WayCode tasks always run on their own branch — that's the join key.
    const branch = body.payload?.deployment?.meta?.githubCommitRef || ''
    if (!branch.startsWith('waycode/')) {
      return NextResponse.json({ ok: true, ignored: 'not-a-waycode-branch' })
    }

    const eventType = body.type || ''
    const project = body.payload?.name || 'project'
    const url = liveUrl(body)

    const supabase = createAdminClient()
    const { data: job } = await supabase
      .from('task_jobs')
      .select('id, user_id, prompt')
      .eq('branch_name', branch)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!job) {
      return NextResponse.json({ ok: true, ignored: 'no-matching-task' })
    }

    if (SUCCESS_EVENTS.has(eventType)) {
      await recordDeployEvent(
        supabase,
        { id: job.id, user_id: job.user_id, prompt: job.prompt },
        {
          success: true,
          source: 'Vercel',
          url,
          message: `${project} deployed successfully${url ? ` — live at ${url}` : ''}`,
        },
      )
      return NextResponse.json({ ok: true, handled: 'deployed' })
    }

    if (FAILURE_EVENTS.has(eventType)) {
      await recordDeployEvent(
        supabase,
        { id: job.id, user_id: job.user_id, prompt: job.prompt },
        {
          success: false,
          source: 'Vercel',
          message: `${project} reported "${eventType}" for ${branch}`,
        },
      )
      return NextResponse.json({ ok: true, handled: 'deploy-failed' })
    }

    return NextResponse.json({ ok: true, ignored: eventType || 'unknown-event' })
  } catch (err) {
    console.error('[Vercel Webhook] Error:', err)
    // Always ack — retries would just duplicate logs.
    return NextResponse.json({ ok: true })
  }
}
