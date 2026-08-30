'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from 'sonner'
import { Plus, History, RefreshCw, ChevronRight, MessageSquare, Settings2, Circle } from 'lucide-react'
import { useAppChrome } from '@/components/app-chrome'

interface SidebarProps {
  onNavigate?: () => void
}

interface ConversationItem {
  id: string
  repo_id: string | null
  repo_name: string | null
  title: string
  updated_at: string
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { repositories, selectedRepo, onSelectRepo, syncRepos, isSyncing, openSettings, triggerNewTask } =
    useAppChrome()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  // undefined = no manual toggle yet → auto-expand the repo of the open thread.
  const [expandedId, setExpandedId] = useState<string | null | undefined>(undefined)

  const activeConversationId = pathname.startsWith('/c/') ? pathname.slice(3) : null
  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null

  // Recent threads — refetch on every route change so a freshly-created
  // conversation appears under its repository immediately.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/conversations')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.success && Array.isArray(data.conversations)) {
          setConversations(data.conversations as ConversationItem[])
        }
      } catch {
        /* offline tolerance */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname])

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

      {/* Repositories with nested chat threads */}
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

        <div className="max-h-full space-y-0.5 overflow-y-auto smooth-scroll-container pr-0.5 pb-1">
          {repositories.length === 0 ? (
            <p className="anim-fade-in px-2 py-4 text-center text-xs leading-relaxed text-[var(--chrome-text-muted)]">
              Connect a repository to start dispatching tasks.
            </p>
          ) : (
            repositories.map((repo, i) => {
              const shortName = repo.repo_name.split('/')[1] || repo.repo_name
              const isSelected = selectedRepo?.id === repo.id
              // repo_id is a fragile FK (repo re-syncs can recycle ids and null it),
              // so repo_name — the stable GitHub full name — is the primary match.
              const chatBelongs = (c: ConversationItem) =>
                c.repo_name ? c.repo_name === repo.repo_name : c.repo_id === repo.id
              const repoChats = conversations.filter(chatBelongs)
              const isExpanded =
                expandedId === undefined ? isSelected || (activeConversation ? chatBelongs(activeConversation) : false) : expandedId === repo.id
              const activeBelongsHere = activeConversation ? chatBelongs(activeConversation) : false

              return (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      onSelectRepo(repo)
                      setExpandedId(isExpanded ? null : repo.id)
                      // Opening a different repo's canvas while inside another
                      // repo's thread starts a NEW chat with that repo.
                      if (pathname.startsWith('/c/') && !activeBelongsHere) {
                        router.push('/')
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
                    }}
                    className={`pressable group flex w-full cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left ${
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
                    {repoChats.length > 0 && (
                      <span className="shrink-0 rounded-full bg-white/6 px-1.5 py-px text-[9px] font-bold text-[var(--chrome-text-muted)]">
                        {repoChats.length}
                      </span>
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 opacity-50 transition-transform duration-300 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="ml-7 border-l border-[var(--chrome-border)] pl-3">
                          {repoChats.length === 0 ? (
                            <span className="block px-1 py-1.5 text-[11px] italic text-[var(--chrome-text-muted)]">
                              No chats yet
                            </span>
                          ) : (
                            <div className="space-y-0.5 py-1">
                              {repoChats.map((chat) => {
                                const isActive = pathname === `/c/${chat.id}`
                                return (
                                  <Link
                                    key={chat.id}
                                    href={`/c/${chat.id}`}
                                    onClick={onNavigate}
                                    title={chat.title}
                                    className={`pressable flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-left ${
                                      isActive
                                        ? 'bg-white/10 text-[var(--chrome-text)]'
                                        : 'text-[var(--chrome-text-secondary)] hover:bg-white/6 hover:text-[var(--chrome-text)]'
                                    }`}
                                  >
                                    <MessageSquare
                                      className={`h-3 w-3 shrink-0 ${isActive ? 'text-[#6aa5ff]' : 'text-[var(--chrome-text-muted)]'}`}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-[12px] leading-snug">
                                      {chat.title}
                                    </span>
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}

          {/* Threads with no repository link at all (truly orphaned) */}
          {conversations.some((c) => !c.repo_id && !c.repo_name) && (
            <div className="mt-2 border-t border-[var(--chrome-border)] pt-2">
              <span className="mb-1 block px-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--chrome-text-muted)]">
                Chats
              </span>
              {conversations
                .filter((c) => !c.repo_id && !c.repo_name)
                .map((conv) => {
                  const isActive = pathname === `/c/${conv.id}`
                  return (
                    <Link
                      key={conv.id}
                      href={`/c/${conv.id}`}
                      onClick={onNavigate}
                      title={conv.title}
                      className={`pressable flex items-center gap-2.5 rounded-2xl px-3 py-2 text-left ${
                        isActive
                          ? 'bg-[rgba(10,102,255,0.18)] font-semibold text-[#6aa5ff]'
                          : 'text-[var(--chrome-text-secondary)] hover:bg-white/6 hover:text-[var(--chrome-text)]'
                      }`}
                    >
                      <MessageSquare
                        className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#6aa5ff]' : 'text-[var(--chrome-text-muted)]'}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{conv.title}</span>
                    </Link>
                  )
                })}
            </div>
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
