import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/main-layout'

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

  return <MainLayout user={user} initialRepositories={repositories} />
}
