import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface PushSubscriptionBody {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

/** Register (or refresh) a browser push subscription for the signed-in user. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as PushSubscriptionBody
    const endpoint = body.endpoint?.trim()
    const p256dh = body.keys?.p256dh?.trim()
    const auth = body.keys?.auth?.trim()

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'endpoint and keys.p256dh/keys.auth are required' }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null

    // Upsert by the unique endpoint — re-subscribing the same device refreshes keys.
    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: user.id, endpoint, p256dh, auth, user_agent: userAgent },
        { onConflict: 'endpoint' },
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

/** Remove a subscription when the user disables notifications or clears site data. */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpoint } = (await request.json()) as { endpoint?: string }
    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })
    }

    // RLS scopes the delete to the caller's own rows.
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
