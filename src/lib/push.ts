import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

const VAPID_PUBLIC_KEY = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.WEB_PUSH_SUBJECT || 'mailto:support@waycode.app'

export function pushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}

export function pushPublicKey(): string | null {
  return pushConfigured() ? VAPID_PUBLIC_KEY : null
}

let vapidInitialized = false
function ensureVapid(): boolean {
  if (!pushConfigured()) return false
  if (!vapidInitialized) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidInitialized = true
  }
  return true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  /** Collapses duplicate notifications for the same task. */
  tag?: string
}

/**
 * Fire-and-forget fan-out of a notification to every device the user has
 * subscribed. Stale endpoints (uninstalled SW, expired subscription) are
 * pruned on 404/410. Never throws — notifications must not break pipelines.
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureVapid()) {
    console.warn('[Push] Skipped — WEB_PUSH_VAPID keys are not configured.')
    return
  }

  let subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    subs = (data ?? []) as typeof subs
  } catch (err) {
    console.error('[Push] Failed to load subscriptions:', err)
    return
  }

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 3600 },
        )
      } catch (err) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('[Push] Delivery failed:', err)
        }
      }
    }),
  )
}
