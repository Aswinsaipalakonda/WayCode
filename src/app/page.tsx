import { createClient } from '@/lib/supabase/server'
import { AppChrome } from '@/components/app-chrome'
import { ChatCanvas } from '@/components/chat-canvas'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let repositories = []
  if (user) {
    const { data } = await supabase
      .from('repositories')
      .select('*')
      .order('created_at', { ascending: false })
    repositories = data || []
  }

  return (
    <AppChrome user={user} initialRepositories={repositories} variant="blend" bodyClassName="overflow-hidden">
      <ChatCanvas />
    </AppChrome>
  )
}
