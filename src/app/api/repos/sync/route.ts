import { createClient } from '@/lib/supabase/server'
import { decryptSecret } from '@/lib/crypto'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const githubUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username

  // provider_token is emitted by supabase-js only once, right after OAuth sign-in,
  // and is never persisted — so it's undefined on every later sync. Fall back to
  // the encrypted GitHub token stored server-side during the auth callback.
  let providerToken = session?.provider_token ?? null
  if (!providerToken) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('github_token')
      .eq('user_id', user.id)
      .maybeSingle()
    if (settings?.github_token) {
      try {
        providerToken = decryptSecret(settings.github_token)
      } catch {
        return NextResponse.json(
          { error: 'Stored GitHub token could not be decrypted — sign out and back in.' },
          { status: 409 },
        )
      }
    }
  }

  try {
    let repos: Array<{ full_name: string; default_branch?: string }> = []

    if (providerToken) {
      const ghRes = await fetch('https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100', {
        headers: {
          Authorization: `Bearer ${providerToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })

      if (ghRes.ok) {
        repos = await ghRes.json()
      } else {
        console.error(`GitHub repo sync failed with HTTP ${ghRes.status}`)
      }
    }

    if (repos.length === 0 && githubUsername) {
      const ghRes = await fetch(`https://api.github.com/users/${githubUsername}/repos?type=owner&sort=updated&per_page=100`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      })
      if (ghRes.ok) {
        repos = await ghRes.json()
      }
    }

    if (githubUsername && repos.length > 0) {
      repos = repos.filter((r: { owner?: { login?: string }; full_name?: string }) => {
        const ownerLogin = r.owner?.login || r.full_name?.split('/')[0]
        return ownerLogin?.toLowerCase() === githubUsername.toLowerCase()
      })
    }

    if (repos.length > 0) {
      // Clear old repositories and insert freshly synced ones
      await supabase
        .from('repositories')
        .delete()
        .eq('user_id', user.id)

      const repoRows = repos.map((r) => ({
        user_id: user.id,
        repo_name: r.full_name,
        default_branch: r.default_branch || 'main',
        connection_state: 'connected',
      }))

      // Return the persisted rows — the client keys/selection rely on `id`.
      const { data: savedRepos, error: upsertError } = await supabase
        .from('repositories')
        .upsert(repoRows, { onConflict: 'user_id,repo_name' })
        .select('id, user_id, repo_name, default_branch, connection_state')

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, count: savedRepos?.length ?? 0, repos: savedRepos ?? [] })
    }

    return NextResponse.json({ success: true, count: 0, repos: [] })
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}
