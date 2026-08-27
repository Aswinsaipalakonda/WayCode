import type { SupabaseClient } from '@supabase/supabase-js'
import { getWhatsAppNumber, sendWhatsAppText } from './whatsapp'
import { sendPushToUser } from './push'

export interface DeployTask {
  id: string
  user_id: string
  prompt?: string | null
  repo_name?: string | null
  branch_name?: string | null
  commit_hash?: string | null
  files_changed?: number | null
  build_time_seconds?: number | null
  pr_url?: string | null
}

export interface DeployEvent {
  success: boolean
  /** Human-facing source, e.g. "vercel", "github-actions", "custom". */
  source: string
  url?: string | null
  message?: string | null
}

/**
 * Format WhatsApp alert message matching the official WayCode topology design (workflow.png)
 */
export function formatWhatsAppDeployMessage(task: DeployTask, event: DeployEvent): string {
  if (!event.success) {
    const errorLines = [
      `⚠️ *Build / Deploy Failed*`,
      `Your changes encountered an issue during execution.`,
      ``,
      task.prompt ? `📝 *Task:* ${String(task.prompt).slice(0, 140)}` : null,
      task.repo_name ? `📦 *Repository:* ${task.repo_name}` : null,
      task.branch_name ? `🔖 *Branch:* ${task.branch_name}` : null,
      ``,
      `⏱️ *Build Status:* Failed (${event.source})`,
      event.message ? `❌ *Details:* ${event.message.slice(0, 200)}` : null,
    ]
    return errorLines.filter(Boolean).join('\n')
  }

  const commitShort = task.commit_hash || (task.branch_name ? task.branch_name.replace('waycode/task-', '').slice(0, 7) : 'latest')
  const mergeUrl = task.pr_url || event.url || null

  const lines = [
    `🚀 *Deployment Successful*`,
    `Your changes have been built and deployed successfully.`,
    ``,
    task.prompt ? `📝 *Task:*\n${String(task.prompt).slice(0, 180)}` : null,
    ``,
    task.repo_name ? `📦 *Repository:*\n${task.repo_name}` : null,
    ``,
    `🔖 *Commit:* ${commitShort}`,
    task.files_changed !== undefined && task.files_changed !== null ? `📁 *Files Changed:* ${task.files_changed}` : null,
    ``,
    `⏱️ *Build Status:* Success${task.build_time_seconds ? `\n   *Build Time:* ${task.build_time_seconds}s` : ''}`,
    mergeUrl ? `\n🔗 *Pull Request / Merge URL:*\n${mergeUrl}` : null,
    ``,
    `Great work! 🚀`,
  ]

  return lines.filter((l) => l !== null).join('\n')
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

  // Out-of-band WhatsApp confirmation with rich structure matching workflow.png
  try {
    const number = await getWhatsAppNumber(supabase, task.user_id)
    if (number) {
      const text = formatWhatsAppDeployMessage(task, event)
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
