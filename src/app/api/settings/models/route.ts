import { createClient } from '@/lib/supabase/server'
import { decryptSecret } from '@/lib/crypto'
import { fetchCatalog, resolveProvider } from '@/lib/byok'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, apiKey, customBaseUrl, useVault } = await request.json()

    // Vault mode — the plaintext key never left the server, so the drawer can
    // restore the live catalog from the stored ciphertext alone.
    let effKey = typeof apiKey === 'string' ? apiKey.trim() : ''
    let effProvider = typeof provider === 'string' ? provider : undefined
    let effBaseUrl = typeof customBaseUrl === 'string' ? customBaseUrl : null

    if (!effKey && useVault) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('provider, api_key, custom_base_url')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!settings?.api_key) {
        return NextResponse.json(
          { success: false, error: 'No key stored in the vault yet' },
          { status: 400 },
        )
      }
      try {
        effKey = decryptSecret(settings.api_key)
      } catch {
        return NextResponse.json(
          { success: false, error: 'Stored key could not be decrypted — replace it in the vault' },
          { status: 409 },
        )
      }
      if (!effProvider) effProvider = settings.provider ?? 'openrouter'
      if (effBaseUrl === null) effBaseUrl = settings.custom_base_url ?? null
    }

    if (!effKey || !effProvider) {
      return NextResponse.json(
        { success: false, error: 'API key is required to fetch models' },
        { status: 400 },
      )
    }

    const eff = resolveProvider(effProvider, effKey, effBaseUrl)
    const result = await fetchCatalog(eff, effKey, effBaseUrl)

    if (result.error && result.total === 0) {
      return NextResponse.json({ success: false, provider: eff, error: result.error })
    }

    return NextResponse.json({
      success: true,
      provider: eff,
      models: result.models,
      total: result.total,
      free: result.free,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown catalog error' },
      { status: 500 },
    )
  }
}
