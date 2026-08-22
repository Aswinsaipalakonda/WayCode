import { createClient } from '@/lib/supabase/server'
import { AppChrome } from '@/components/app-chrome'
import { TaskBoard } from '@/components/task-board'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: repositories } = await supabase
    .from('repositories')
    .select('*')

  const { data: tasks } = await supabase
    .from('task_jobs')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AppChrome user={user} initialRepositories={repositories || []}>
      <div className="h-full overflow-y-auto pb-28 md:pb-10">
        <main className="anim-slide-right mx-auto w-full max-w-3xl px-4 pt-5 sm:px-6">
          <TaskBoard tasks={tasks || []} />
        </main>
      </div>
    </AppChrome>
  )
}
