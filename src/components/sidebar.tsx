'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Plus, History, RefreshCw, ChevronRight, GitBranch, Settings2, Circle } from 'lucide-react'
import { useAppChrome } from '@/components/app-chrome'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { repositories, selectedRepo, onSelectRepo, syncRepos, isSyncing, openSettings, triggerNewTask } =
    useAppChrome()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSync = async () => {
    try {
      const repos = await syncRepos()
      toast.success('Repositories synced', {
        description: `${repos.length} ${repos.length === 1 ? 'repository' : 'repositories'} connected.`,
      })
    } catch {
      toast.error('Sync failed', { description: 'Could not refresh your repositories right now.' })
    }
  }

  return (
    <aside className="flex h-full w-full flex-col bg-[var(--chrome-bg)] text-[13px] select-none">
      {/* Primary actions */}
      <div className="space-y-1 p-3">
        <button
          onClick={() => {
            triggerNewTask()
            onNavigate?.()
          }}
          className="btn-brand pressable flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Task
        </button>

        <Link
          href="/tasks"
          onClick={onNavigate}
          className={`pressable flex items-center gap-2.5 rounded-full px-3.5 py-2.5 font-medium ${
            pathname === '/tasks'
              ? 'bg-white/10 text-[var(--chrome-text)]'
              : 'text-[var(--chrome-text-secondary)] hover:bg-white/6 hover:text-[var(--chrome-text)]'
          }`}
        >
          <History className="h-4 w-4" />
          Job History
        </Link>
      </div>

      {/* Repositories */}
      <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3">
        <div className="mb-1 flex items-center justify-between px-1.5 pt-1 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--chrome-text-muted)]">
            Repositories · {repositories.length}
          </span>
          <button
            onClick={handleSync}
            aria-label="Sync repositories"
            className="pressable rounded-full p-1.5 text-[var(--chrome-text-muted)] hover:bg-white/8 hover:text-[var(--chrome-text)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="max-h-full space-y-0.5 overflow-y-auto pr-0.5 pb-1">
          {repositories.length === 0 ? (
            <p className="anim-fade-in px-2 py-4 text-center text-xs leading-relaxed text-[var(--chrome-text-muted)]">
              Connect a repository to start dispatching tasks.
            </p>
          ) : (
            repositories.map((repo, i) => {
              const shortName = repo.repo_name.split('/')[1] || repo.repo_name
              const isSelected = selectedRepo?.id === repo.id
              const isExpanded = expandedId === repo.id

              return (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button
                    onClick={() => {
                      onSelectRepo(repo)
                      onNavigate?.()
                    }}
                    className={`pressable group flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left ${
                      isSelected
                        ? 'bg-[rgba(10,102,255,0.18)] font-semibold text-[#6aa5ff]'
                        : 'text-[var(--chrome-text-secondary)] hover:bg-white/6 hover:text-[var(--chrome-text)]'
                    }`}
                  >
                    <Circle
                      className={`h-2 w-2 shrink-0 transition-colors ${
                        isSelected ? 'fill-[#6aa5ff] text-[#6aa5ff]' : 'text-[var(--chrome-text-muted)]'
                      }`}
                      fill={isSelected ? 'currentColor' : 'none'}
                    />
                    <span className="truncate flex-1">{shortName}</span>
                    <ChevronRight
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(isExpanded ? null : repo.id)
                      }}
                      className={`h-3.5 w-3.5 shrink-0 opacity-50 transition-transform duration-300 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="ml-7 border-l border-[var(--chrome-border)] py-1 pl-3">
                          <span className="flex items-center gap-1.5 py-1 text-[11px] text-[var(--chrome-text-muted)]">
                            <GitBranch className="h-3 w-3" />
                            <code className="font-mono-code">{repo.default_branch || 'main'}</code>
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--chrome-border)] p-3">
        <button
          onClick={() => {
            openSettings()
            onNavigate?.()
          }}
          className="pressable flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.5 font-medium text-[var(--chrome-text-secondary)] hover:bg-white/6 hover:text-[var(--chrome-text)]"
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  )
}
