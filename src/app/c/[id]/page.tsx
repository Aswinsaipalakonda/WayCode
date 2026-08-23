import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppChrome } from '@/components/app-chrome'
import { ConversationChat } from '@/components/chat-canvas'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // RLS scopes this to the owner — other users' threads read as missing.
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, repo_id, repo_name')
    .eq('id', id)
    .maybeSingle()
  if (!conversation) redirect('/')

  const { data: repositories } = await supabase
    .from('repositories')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AppChrome
      user={user}
      initialRepositories={repositories || []}
      bodyClassName="chat-scene overflow-hidden"
    >
      <ConversationChat
        conversation={{
          id: conversation.id,
          repoId: conversation.repo_id,
          repoName: conversation.repo_name,
        }}
      />
    </AppChrome>
  )
}
