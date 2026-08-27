import type { SupabaseClient } from '@supabase/supabase-js'

const GRAPH_VERSION = 'v21.0'

export function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_TOKEN || ''
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  return { token, phoneId }
}

export function whatsappConfigured(): boolean {
  const { token, phoneId } = getWhatsAppConfig()
  return !!(token && phoneId)
}

/** Fetch the user's registered WhatsApp number, if any. */
export async function getWhatsAppNumber(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('user_settings')
      .select('whatsapp_number')
      .eq('user_id', userId)
      .single()
    const number = (data?.whatsapp_number as string | null)?.trim()
    return number || null
  } catch {
    return null
  }
}

/**
 * Out-of-band deployment confirmation via Meta WhatsApp Business Cloud API
 * (PRD §7.7). Never throws — notification failures must not fail webhooks.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  const { token, phoneId } = getWhatsAppConfig()
  if (!token || !phoneId) {
    console.warn('[WhatsApp] Skipped — WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured.')
    return false
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^\d+]/g, ''),
          type: 'text',
          text: { preview_url: true, body },
        }),
        signal: AbortSignal.timeout(8000),
      },
    )
    if (!res.ok) {
      console.error('[WhatsApp] Send failed:', await res.text().catch(() => res.status))
      return false
    }
    return true
  } catch (err) {
    console.error('[WhatsApp] Send error:', err)
    return false
  }
}
