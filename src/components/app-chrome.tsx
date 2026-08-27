'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { useSyncExternalStore } from 'react'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { BottomNav } from '@/components/bottom-nav'
import { SettingsDrawer } from '@/components/settings-drawer'
import { RepoPicker } from '@/components/repo-picker'
import {
  getServerRepoId,
  getStoredRepoId,
  setStoredRepoId,
  subscribeRepoStore,
} from '@/lib/repo-store'

export interface Repository {
  id: string
  repo_name: string
  default_branch: string
  deploy_webhook_url?: string | null
}

/** Defensive dedupe — React keys + selection both assume unique ids/names. */
function dedupeRepos(list: Repository[]): Repository[] {
  const seenId = new Set<string>()
  const seenName = new Set<string>()
  return list.filter((repo) => {
    if (!repo.id || seenId.has(repo.id) || seenName.has(repo.repo_name)) return false
    seenId.add(repo.id)
    seenName.add(repo.repo_name)
    return true
  })
}

interface AppChromeValue {
  user: AppChromeProps['user']
  repositories: Repository[]
  selectedRepo: Repository | null
  isSyncing: boolean
  openRepoPicker: () => void
  onSelectRepo: (repo: Repository | null) => void
  syncRepos: () => Promise<Repository[]>
  openSettings: () => void
  triggerNewTask: () => void
  newTaskNonce: number
}

const AppChromeContext = createContext<AppChromeValue | null>(null)

export function useAppChrome(): AppChromeValue {
  const ctx = useContext(AppChromeContext)
  if (!ctx) throw new Error('useAppChrome must be used inside <AppChrome>')
  return ctx
}

interface AppChromeProps {
  user?: {
    id?: string
    email?: string
    user_metadata?: {
      avatar_url?: string
      full_name?: string
      user_name?: string
    }
  } | null
  initialRepositories: Repository[]
  /** Extra classes for the main body — e.g. 'chat-scene overflow-hidden' on the chat screen. */
  bodyClassName?: string
  children: React.ReactNode
}

export function AppChrome({ user, initialRepositories, bodyClassName, children }: AppChromeProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [repositories, setRepositories] = useState<Repository[]>(() => dedupeRepos(initialRepositories))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [repoPickerOpen, setRepoPickerOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [newTaskNonce, setNewTaskNonce] = useState(0)

  // The chosen repository is remembered across sessions and pages.
  const storedRepoId = useSyncExternalStore(subscribeRepoStore, getStoredRepoId, getServerRepoId)
  const selectedRepo = useMemo(
    () => repositories.find((repo) => repo.id === storedRepoId) ?? null,
    [repositories, storedRepoId]
  )

  const syncRepos = useCallback(async (): Promise<Repository[]> => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/repos/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok && Array.isArray(data.repos)) {
        const repos = dedupeRepos(data.repos as Repository[])
        setRepositories(repos)
        return repos
      }
      return []
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const onSelectRepo = useCallback((repo: Repository | null) => {
    setStoredRepoId(repo ? repo.id : null)
  }, [])

  const triggerNewTask = useCallback(() => {
    setNewTaskNonce((n) => n + 1)
    setDrawerOpen(false)
    if (pathname !== '/') router.push('/')
  }, [pathname, router])

  const handleMenuClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      setDesktopSidebarOpen((v) => !v)
    } else {
      setDrawerOpen(true)
    }
  }, [])

  const value = useMemo<AppChromeValue>(
    () => ({
      user,
      repositories,
      selectedRepo,
      isSyncing,
      openRepoPicker: () => setRepoPickerOpen(true),
      onSelectRepo,
      syncRepos,
      openSettings: () => setSettingsOpen(true),
      triggerNewTask,
      newTaskNonce,
    }),
    [user, repositories, selectedRepo, isSyncing, onSelectRepo, syncRepos, triggerNewTask, newTaskNonce]
  )

  return (
    <AppChromeContext.Provider value={value}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--background)]">
        <Header user={user} onMenuClick={handleMenuClick} />

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop sidebar — dark chrome */}
          <AnimatePresence initial={false}>
            {desktopSidebarOpen && (
              <motion.aside
                key="desktop-sidebar"
                initial={{ width: 0 }}
                animate={{ width: 268 }}
                exit={{ width: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="hidden shrink-0 overflow-hidden border-r border-[var(--chrome-border)] bg-[var(--chrome-bg)] md:block"
              >
                <Sidebar />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Mobile drawer — dark chrome */}
          <AnimatePresence>
            {drawerOpen && (
              <div key="mobile-drawer" className="fixed inset-0 z-50 md:hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setDrawerOpen(false)}
                  className="absolute inset-0 bg-[rgba(20,24,32,0.45)] backdrop-blur-[4px]"
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', stiffness: 340, damping: 36 }}
                  className="absolute inset-y-0 left-0 w-[300px] max-w-[86vw] border-r border-[var(--chrome-border)] bg-[var(--chrome-bg)] shadow-[var(--shadow-lg)]"
                >
                  <Sidebar onNavigate={() => setDrawerOpen(false)} />
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <main className={`min-w-0 flex-1 ${bodyClassName ?? ''}`}>{children}</main>
        </div>

        <BottomNav />
        <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

        {/* Shared repository picker — reachable from any screen */}
        <RepoPicker
          isOpen={repoPickerOpen}
          onClose={() => setRepoPickerOpen(false)}
          repositories={repositories}
          selectedId={selectedRepo?.id ?? null}
          onSelect={(repo) => onSelectRepo(repo)}
          onSync={() => syncRepos()}
          isSyncing={isSyncing}
        />
      </div>
    </AppChromeContext.Provider>
  )
}
