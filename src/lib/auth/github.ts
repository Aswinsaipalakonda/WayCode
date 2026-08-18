'use client'

import { createClient } from '@/lib/supabase/client'

export function useGitHubAuth() {
  const supabase = createClient()

  const signInWithGitHub = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${origin}/auth/callback`,
        scopes: 'repo read:user user:email',
        queryParams: {
          prompt: 'consent',
        },
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return { signInWithGitHub, signOut }
}
