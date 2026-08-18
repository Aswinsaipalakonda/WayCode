import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerToken = session.provider_token
  if (!providerToken) {
    return NextResponse.json({ 
      error: 'No GitHub provider token found in session. Please sign out and sign in again with GitHub.' 
    }, { status: 400 })
  }

  try {
    const ghRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!ghRes.ok) {
      const errText = await ghRes.text()
      return NextResponse.json({ error: `GitHub API error: ${errText}` }, { status: ghRes.status })
    }

    const repos = await ghRes.json()
    const repoRows = repos.map((r: { full_name: string; default_branch: string }) => ({
      user_id: session.user.id,
      repo_name: r.full_name,
      default_branch: r.default_branch || 'main',
      connection_state: 'connected',
    }))

    if (repoRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('repositories')
        .upsert(repoRows, { onConflict: 'user_id,repo_name' })

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, count: repoRows.length })
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}
