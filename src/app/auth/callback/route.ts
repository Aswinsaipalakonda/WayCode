import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      const providerToken = session.provider_token
      if (providerToken) {
        try {
          // Fetch authenticated user's repositories (type=owner only to get user's exact repositories)
          const ghRes = await fetch('https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100', {
            headers: {
              Authorization: `Bearer ${providerToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          })

          if (ghRes.ok) {
            const repos = await ghRes.json()
            const activeRepoNames = repos.map((r: { full_name: string }) => r.full_name)

            // Delete stale repositories no longer owned by user
            if (activeRepoNames.length > 0) {
              await supabase
                .from('repositories')
                .delete()
                .eq('user_id', session.user.id)
                .not('repo_name', 'in', `(${activeRepoNames.map((n: string) => `"${n}"`).join(',')})`)
            } else {
              await supabase
                .from('repositories')
                .delete()
                .eq('user_id', session.user.id)
            }

            const repoRows = repos.map((r: { full_name: string; default_branch: string }) => ({
              user_id: session.user.id,
              repo_name: r.full_name,
              default_branch: r.default_branch || 'main',
              connection_state: 'connected',
            }))

            if (repoRows.length > 0) {
              await supabase
                .from('repositories')
                .upsert(repoRows, { onConflict: 'user_id,repo_name' })
            }
          }
        } catch (e) {
          console.error('Failed to sync GitHub repositories:', e)
        }
      }
      return redirect(next)
    }
  }

  return redirect('/auth/auth-code-error')
}
