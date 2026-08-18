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
      // Sync user GitHub repositories using provider token if available
      const providerToken = session.provider_token
      if (providerToken) {
        try {
          const ghRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
            headers: {
              Authorization: `Bearer ${providerToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          })

          if (ghRes.ok) {
            const repos = await ghRes.json()
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
