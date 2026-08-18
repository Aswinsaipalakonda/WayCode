'use client'

import { useState } from 'react'
import Image from 'next/image'
import { GitBranch, Settings, LogIn, LogOut, ChevronDown, Check, Sparkles } from 'lucide-react'
import { useGitHubAuth } from '@/lib/auth/github'
import { SettingsDrawer } from '@/components/settings-drawer'

interface Repository {
  id: string
  full_name: string
  default_branch: string
}

interface HeaderProps {
  user?: {
    email?: string
    user_metadata?: {
      avatar_url?: string
      full_name?: string
    }
  } | null
  repositories?: Repository[]
}

export function Header({ user, repositories = [] }: HeaderProps) {
  const { signInWithGitHub, signOut } = useGitHubAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isRepoMenuOpen, setIsRepoMenuOpen] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(
    repositories.length > 0 ? repositories[0] : null
  )

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-14 bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="WayCode Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <span className="font-bold text-lg tracking-tight text-[var(--foreground)] flex items-center gap-1.5">
            WayCode
            <span className="text-[10px] bg-[var(--primary)]/15 text-[var(--primary)] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Gateway
            </span>
          </span>
        </div>

        {/* Center: Repository Selector Pill (ChatGPT Style) */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setIsRepoMenuOpen(!isRepoMenuOpen)}
              className="flex items-center gap-2 bg-[var(--background)] hover:bg-[var(--muted)] border border-[var(--border)] px-3 py-1.5 rounded-full text-xs font-medium text-[var(--foreground)] transition-colors shadow-xs"
            >
              <GitBranch className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="max-w-[140px] truncate">
                {selectedRepo ? selectedRepo.full_name : 'Select Repository'}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)]" />
            </button>

            {isRepoMenuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-semibold text-[var(--muted-foreground)] px-2 py-1 uppercase tracking-wider">
                  Connected Repositories ({repositories.length})
                </div>
                {repositories.length === 0 ? (
                  <div className="p-3 text-center space-y-2">
                    <div className="text-xs text-[var(--muted-foreground)]">
                      No repositories synchronized yet.
                    </div>
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/repos/sync', { method: 'POST' })
                        if (res.ok) {
                          window.location.reload()
                        } else {
                          signInWithGitHub()
                        }
                      }}
                      className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold py-1.5 px-3 rounded-lg transition-colors"
                    >
                      Sync Repositories Now
                    </button>
                  </div>
                ) : (
                  repositories.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => {
                        setSelectedRepo(repo)
                        setIsRepoMenuOpen(false)
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-[var(--muted)] transition-colors text-[var(--foreground)] text-left"
                    >
                      <span className="truncate font-medium">{repo.full_name}</span>
                      {selectedRepo?.id === repo.id && (
                        <Check className="w-3.5 h-3.5 text-[var(--primary)]" />
                      )}
                    </button>
                  ))
                )}
                <div className="border-t border-[var(--border)] mt-1 pt-1">
                  <button
                    onClick={signInWithGitHub}
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Re-Authorize GitHub Repositories
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                title="AI Provider Settings (BYOK)"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="User Avatar"
                    width={28}
                    height={28}
                    className="rounded-full border border-[var(--border)]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center">
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
                
                <button
                  onClick={signOut}
                  className="p-1.5 text-xs text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={signInWithGitHub}
              className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In with GitHub
            </button>
          )}
        </div>
      </header>

      {/* BYOK Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}
