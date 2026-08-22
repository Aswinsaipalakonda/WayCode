import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS. Used exclusively by
 * trusted server contexts: the background daemon and the approve/reject
 * routes' server-side helpers. NEVER import this from client components.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL are required for admin access',
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
