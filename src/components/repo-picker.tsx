'use client'

import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'
import { FolderGit2, GitBranch, CheckCircle2, RefreshCw, X } from 'lucide-react'

interface Repository {
  id: string
  repo_name: string
  default_branch: string
}

interface RepoPickerProps {
  isOpen: boolean
  onClose: () => void
  repositories: Repository[]
  selectedId: string | null
  onSelect: (repo: Repository) => void
  onSync: () => Promise<unknown>
  isSyncing?: boolean
}

export function RepoPicker({
  isOpen,
  onClose,
  repositories,
  selectedId,
  onSelect,
  onSync,
  isSyncing = false,
}: RepoPickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-6">
          <motion.button
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(24,30,44,0.35)] backdrop-blur-[4px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a repository"
            initial={{ y: '42%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '55%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="relative w-full sm:max-w-md max-h-[72vh] flex flex-col bg-white rounded-t-[28px] sm:rounded-[28px] shadow-[var(--shadow-lg)] overflow-hidden"
          >
            {/* Grab handle (mobile) */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <span className="h-1 w-9 rounded-full bg-[rgba(18,22,33,0.14)]" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 pt-1 sm:pt-5">
              <div>
                <h2 className="text-[15px] font-bold tracking-tight">Choose a repository</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Pick where this task should run before writing your prompt.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="pressable rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
              {repositories.length === 0 ? (
                <div className="py-10 text-center">
                  <span className="anim-float mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
                    <FolderGit2 className="h-5 w-5 text-[var(--brand)]" />
                  </span>
                  <p className="text-[13px] text-[var(--muted-foreground)] mb-4">
                    No repositories connected yet.
                  </p>
                  <button
                    onClick={onSync}
                    disabled={isSyncing}
                    className="btn-brand pressable inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync GitHub repositories
                  </button>
                </div>
              ) : (
                repositories.map((repo, i) => {
                  const selected = repo.id === selectedId
                  const shortName = repo.repo_name.split('/')[1] || repo.repo_name
                  return (
                    <motion.button
                      key={repo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => {
                        onSelect(repo)
                        onClose()
                      }}
                      className={`pressable w-full flex items-center gap-3 rounded-3xl border p-3.5 text-left ${
                        selected
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                          : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)]'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          selected ? 'bg-[var(--brand)] text-white' : 'bg-[var(--brand-soft)] text-[var(--brand)]'
                        }`}
                      >
                        <Image src="/logo.png" alt="" width={18} height={18} className="object-contain" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{shortName}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                          <GitBranch className="h-3 w-3" />
                          <span className="font-mono-code">{repo.default_branch || 'main'}</span>
                          <span>·</span>
                          <span className="truncate">{repo.repo_name}</span>
                        </span>
                      </span>
                      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand)]" />}
                    </motion.button>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
