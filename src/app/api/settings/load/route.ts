import { createClient } from '@/lib/supabase/server'
import { decryptSecret } from '@/lib/crypto'
import { NextResponse } from 'next/server'

/**
 * GET /api/settings/load — restore the saved vault state for the signed-in
 * user. The API key itself never leaves the server; only a masked hint
 * (prefix…last4) is returned so the UI can prove a key exists.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error: queryError } = await supabase
      .from('user_settings')
      .select('provider, api_key, selected_model, custom_base_url, last_test_status, last_test_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!settings) {
      return NextResponse.json({ success: true, configured: false })
    }

    let hasKey = false
    let keyHint: string | null = null
    let keyReadable = false

    if (settings.api_key) {
      try {
        const key = decryptSecret(settings.api_key)
        hasKey = key.trim().length > 0
        // Masked hint: generic prefix + last 4 chars — safe to display.
        if (hasKey) {
          keyHint = `${key.slice(0, Math.min(key.length - 4, 9))}…${key.slice(-4)}`
          keyReadable = true
        }
      } catch {
        // Ciphertext exists but can't be decrypted with this master key —
        // surface that state without ever exposing bytes of the secret.
        hasKey = true
        keyHint = null
        keyReadable = false
      }
    }

    return NextResponse.json({
      success: true,
      configured: hasKey,
      provider: settings.provider ?? 'openrouter',
      model: settings.selected_model ?? '',
      customBaseUrl: settings.custom_base_url ?? null,
      hasKey,
      keyHint,
      keyReadable,
      lastTestStatus: settings.last_test_status ?? null,
      lastTestAt: settings.last_test_at ?? null,
      updatedAt: settings.updated_at ?? null,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
