import type { SupabaseClient } from '@supabase/supabase-js'
import { getWhatsAppNumber, sendWhatsAppText } from './whatsapp'
import { sendPushToUser } from './push'

export interface DeployTask {
  id: string
  user_id: string
  prompt?: string | null
}

export interface DeployEvent {
  success: boolean
  /** Human-facing source, e.g. "vercel", "github-actions", "custom". */
  source: string
  url?: string | null
  message?: string | null
}

/**
 * Single funnel for deployment telemetry (PRD §5.7 / §7.7): append to the
 * task log, then fan out WhatsApp + web push to the owner. Never throws.
 * Works for any platform — Vercel webhooks, GitHub Actions on a VPS,
 * AWS CodeBuild steps, anything that can reach the endpoint.
 */
export async function recordDeployEvent(
  supabase: SupabaseClient,
  task: DeployTask,
  event: DeployEvent,
): Promise<void> {
  const label = event.success ? 'DEPLOYED' : 'DEPLOY FAILED'
  const detail =
    event.message ??
    `${event.source} deployed successfully${event.url ? ` — live at ${event.url}` : ''}`

  try {
    await supabase.from('task_logs').insert({
      task_id: task.id,
      log_level: event.success ? 'success' : 'error',
      message: `[${label}] ${detail}`,
    })
  } catch {
    /* logging must never break alerting */
  }

  // Out-of-band WhatsApp confirmation with the live URL.
  try {
    const number = await getWhatsAppNumber(supabase, task.user_id)
    if (number) {
      const text =
        event.success
          ? `✅ WayCode deployment succeeded (${event.source})\n\nTask: ${String(task.prompt ?? '').slice(0, 90)}${String(task.prompt ?? '').length > 90 ? '…' : ''}${event.url ? `\n\n🔗 Live: ${event.url}` : ''}`
          : `⚠️ WayCode deployment failed (${event.source})\n\nTask: ${String(task.prompt ?? '').slice(0, 90)}${event.message ? `\n\n${event.message.slice(0, 200)}` : ''}`
      await sendWhatsAppText(number, text)
    }
  } catch {
    /* non-fatal */
  }

  // Web push for users who enabled notifications.
  try {
    await sendPushToUser(supabase, task.user_id, {
      title: event.success ? 'Deployment live 🚀' : 'Deployment failed ⚠️',
      body:
        event.success
          ? `${event.source}${event.url ? ` — ${event.url}` : ' shipped your approved changes.'}`
          : `${event.source} reported a failure. Check the task logs.`,
      url: '/tasks',
      tag: task.id,
    })
  } catch {
    /* non-fatal */
  }
}
