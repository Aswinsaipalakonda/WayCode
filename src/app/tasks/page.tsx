import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { CheckSquare, Clock, Terminal } from 'lucide-react'

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col pb-20 md:pb-0">
      <Header user={user} repositories={repositories || []} />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[var(--primary)]" />
            Task Jobs & Execution History
          </h1>
          <span className="text-xs text-[var(--muted-foreground)]">
            {tasks?.length || 0} Total Jobs
          </span>
        </div>

        <div className="space-y-3">
          {(!tasks || tasks.length === 0) ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-8 text-center space-y-2 shadow-md">
              <Clock className="w-8 h-8 text-[var(--muted-foreground)] mx-auto" />
              <h3 className="font-semibold text-sm">No Task Jobs Submitted Yet</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Submit an intent from the chat canvas to initiate your first autonomous AI daemon job.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4"
              >
                <div className="space-y-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--foreground)] truncate">
                      {task.prompt}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                    <Terminal className="w-3 h-3 text-[var(--primary)]" />
                    <span>Branch: {task.branch_name || 'waycode/task-init'}</span>
                    <span>•</span>
                    <span>{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  task.status === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-amber-500/15 text-amber-500'
                }`}>
                  {task.status}
                </span>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Mobile 4-Tab Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
