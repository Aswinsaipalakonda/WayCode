import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface OrphanJob {
  id: string
  repo_id: string | null
  prompt: string
}

/**
 * GET /api/conversations — conversation threads for the sidebar, grouped
 * client-side by repository. RLS scopes rows to the owner.
 *
 * Self-heal: jobs created before conversations existed (conversation_id IS
 * NULL) are grouped into per-(user, repo) threads on first load, so legacy
 * history surfaces in the sidebar without a manual migration. After the one
 * healing pass the orphan lookup is a single indexed no-op.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const listConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, repo_id, repo_name, title, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(60)
      return { data: data ?? [], error }
    }

    let { data: conversations, error: queryError } = await listConversations()
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // ---------- Legacy self-heal ----------
    const { data: orphans } = await supabase
      .from('task_jobs')
      .select('id, repo_id, prompt, created_at')
      .is('conversation_id', null)
      .order('created_at', { ascending: true })
      .limit(200)

    if (orphans && orphans.length > 0) {
      const knownConvRepoIds = new Set(
        (conversations ?? []).map((c) => c.repo_id).filter((id): id is string => Boolean(id)),
      )
      const hasRepolessConv = (conversations ?? []).some((c) => !c.repo_id)

      // Group orphans by repo, keeping the earliest prompt as the thread title.
      const groups = new Map<string, { repoId: string | null; title: string }>()
      for (const o of orphans as OrphanJob[]) {
        const key = o.repo_id ?? '__none__'
        if (!groups.has(key)) {
          groups.set(key, { repoId: o.repo_id, title: o.prompt.slice(0, 72) })
        }
      }

      const repoIds = [...new Set([...groups.values()].map((g) => g.repoId).filter((id): id is string => Boolean(id)))]
      const nameById = new Map<string, string>()
      if (repoIds.length > 0) {
        const { data: repos } = await supabase.from('repositories').select('id, repo_name').in('id', repoIds)
        for (const r of repos ?? []) nameById.set(r.id, r.repo_name)
      }

      let healed = false
      for (const [key, group] of groups) {
        const isRepoless = key === '__none__'
        if (isRepoless ? hasRepolessConv : knownConvRepoIds.has(group.repoId!)) continue

        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            repo_id: group.repoId,
            repo_name: group.repoId ? nameById.get(group.repoId) ?? null : null,
            title: group.title,
          })
          .select('id')
          .single()
        if (convError || !conv) continue

        const linkQuery = supabase
          .from('task_jobs')
          .update({ conversation_id: conv.id })
          .eq('user_id', user.id)
          .is('conversation_id', null)
        await (isRepoless ? linkQuery.is('repo_id', null) : linkQuery.eq('repo_id', group.repoId!))
        healed = true
      }

      if (healed) {
        const fresh = await listConversations()
        conversations = fresh.data
        queryError = fresh.error
        if (queryError) {
          return NextResponse.json({ error: queryError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true, conversations })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
