import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchCatalog, resolveProvider } from '@/lib/byok'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, apiKey, customBaseUrl } = await request.json()

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'API key is required to fetch models' },
        { status: 400 },
      )
    }

    const eff = resolveProvider(String(provider ?? 'openrouter'), apiKey, customBaseUrl)
    const result = await fetchCatalog(eff, apiKey.trim(), customBaseUrl)

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
