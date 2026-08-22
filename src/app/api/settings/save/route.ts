import { createClient } from '@/lib/supabase/server'
import { encryptSecret } from '@/lib/crypto'
import { NextResponse } from 'next/server'

const VALID_PROVIDERS = new Set(['openrouter', 'gemini', 'custom'])

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, apiKey, model, customBaseUrl, testStatus } = await request.json()

    if (!provider || !VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }
    if (!model || typeof model !== 'string') {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 })
    }

    // Load the existing row so an empty apiKey field never wipes a stored key.
    const { data: existing } = await supabase
      .from('user_settings')
      .select('api_key')
      .eq('user_id', user.id)
      .single()

    const update: Record<string, unknown> = {
      provider,
      selected_model: model,
      custom_base_url: customBaseUrl || null,
      updated_at: new Date().toISOString(),
    }

    if (typeof testStatus === 'string') {
      update.last_test_status = testStatus
      update.last_test_at = new Date().toISOString()
    }

    if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
      update.api_key = encryptSecret(apiKey.trim())
    } else if (!existing?.api_key) {
      return NextResponse.json(
        { error: 'An API key is required for the first save' },
        { status: 400 },
      )
    }

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert(
        { user_id: user.id, ...update },
        { onConflict: 'user_id' },
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      keyReplaced: Boolean(update.api_key),
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
