'use client'

import { useState } from 'react'
import { Folder, Plus, History, Clock, Settings, RefreshCw, ChevronRight } from 'lucide-react'

interface Repository {
  id: string
  repo_name: string
  default_branch: string
}

interface SidebarProps {
  repositories: Repository[]
  selectedRepo: Repository | null
  onSelectRepo: (repo: Repository) => void
  onOpenSettings: () => void
  onSyncRepos: () => void
}

export function Sidebar({
  repositories,
  selectedRepo,
  onSelectRepo,
  onOpenSettings,
  onSyncRepos,
}: SidebarProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    await onSyncRepos()
    setIsSyncing(false)
  }

  // Sample tasks per repository matching Antigravity 2.0 sidebar design
  const sampleTasks: Record<string, Array<{ title: string; time: string }>> = {
    'kvr-motors-erp-1': [
      { title: 'Application Presentation...', time: '7d' },
      { title: 'Fixing Supervisor Dashb...', time: '28d' },
    ],
    'Skillvault-047': [
      { title: 'Fixing Navigation and In...', time: '3m' },
      { title: 'Developing Certification...', time: '1mo' },
    ],
    'GramaVoice': [
      { title: 'Optimizing Grievance Flow...', time: '2mo' },
    ],
  }

  return (
    <aside className="w-64 h-full bg-[var(--card)] border-r border-[var(--border)] flex flex-col justify-between p-3 select-none text-xs">
      {/* Top Section */}
      <div className="space-y-4">
        {/* Top Quick Actions */}
        <div className="space-y-1.5">
          <button className="w-full bg-[var(--primary)] text-white font-semibold py-2 px-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-sm hover:opacity-90">
            <Plus className="w-4 h-4 text-white" />
            <span>New Conversation</span>
          </button>
          
          <button className="w-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] py-2 px-4 rounded-full flex items-center gap-2 transition-colors">
            <History className="w-4 h-4" />
            <span>Conversation History</span>
          </button>

          <button className="w-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] py-2 px-4 rounded-full flex items-center gap-2 transition-colors">
            <Clock className="w-4 h-4" />
            <span>Scheduled Tasks</span>
          </button>
        </div>

        {/* Projects / Repositories Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
            <span>Projects ({repositories.length})</span>
            <button
              onClick={handleSync}
              className="hover:text-[var(--foreground)] p-1 rounded-full transition-colors"
              title="Sync Repositories"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {repositories.length === 0 ? (
              <div className="p-3 text-center space-y-2 bg-[var(--background)] rounded-2xl border border-[var(--border)]">
                <p className="text-[11px] text-[var(--muted-foreground)]">No projects synced</p>
                <button
                  onClick={handleSync}
                  className="w-full bg-[var(--primary)] text-white text-[11px] font-semibold py-1.5 px-3 rounded-full"
                >
                  Sync Repos
                </button>
              </div>
            ) : (
              repositories.map((repo) => {
                const isSelected = selectedRepo?.id === repo.id
                const shortName = repo.repo_name.split('/')[1] || repo.repo_name
                const tasks = sampleTasks[shortName] || [
                  { title: 'Refactoring Architecture...', time: '1d' },
                  { title: 'Updating Dependencies...', time: '3d' },
                ]

                return (
                  <div key={repo.id} className="space-y-1">
                    {/* Repository Folder Header */}
                    <button
                      onClick={() => onSelectRepo(repo)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-full transition-all font-medium text-left ${
                        isSelected
                          ? 'bg-[var(--primary)] text-white font-bold shadow-xs'
                          : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
                      }`}
                    >
                      <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[var(--muted-foreground)]'}`} />
                      <span className="truncate flex-1">{shortName}</span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90 text-white' : 'text-[var(--muted-foreground)]'}`} />
                    </button>

                    {/* Sub-tasks / Conversations under Repository */}
                    {isSelected && (
                      <div className="pl-6 space-y-1 border-l border-[var(--border)] ml-4 my-1">
                        {tasks.map((t, idx) => (
                          <button
                            key={idx}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded-full text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors text-left"
                          >
                            <span className="truncate">{t.title}</span>
                            <span className="text-[9px] opacity-60 ml-1">{t.time}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Settings Button */}
      <div className="pt-2 border-t border-[var(--border)]">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Settings (BYOK Vault)</span>
        </button>
      </div>
    </aside>
  )
}
