import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerToken = session?.provider_token
  const githubUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username

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

      await supabase
        .from('repositories')
        .upsert(repoRows, { onConflict: 'user_id,repo_name' })

      return NextResponse.json({ success: true, count: repoRows.length, repos: repoRows })
    }

    return NextResponse.json({ success: true, count: 0, repos: [] })
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}
