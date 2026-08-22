'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, UserRound, ListChecks, LogOut } from 'lucide-react'
import { useGitHubAuth } from '@/lib/auth/github'
import { GithubIcon } from '@/components/icons'

interface HeaderProps {
  user?: {
    email?: string
    user_metadata?: {
      avatar_url?: string
      full_name?: string
    }
  } | null
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const { signInWithGitHub } = useGitHubAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 z-40 h-14 w-full border-b border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-2 flex items-center justify-between">
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-1 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="pressable p-2.5 rounded-full text-[var(--chrome-text-secondary)] hover:bg-white/8 hover:text-[var(--chrome-text)]"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/" className="flex items-center gap-2.5 pl-1 group">
          <span className="relative w-8 h-8 shrink-0 overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
            <Image src="/logo.png" alt="WayCode logo" width={32} height={32} className="h-full w-full object-cover" />
          </span>
          <span className="text-gradient-brand font-extrabold text-[17px] tracking-tight">
            WayCode
          </span>
        </Link>
      </div>

      {/* Right: profile only */}
      <div className="flex items-center gap-1.5">
        {user ? (
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account"
              aria-expanded={menuOpen}
              className="pressable block rounded-full ring-2 ring-transparent hover:ring-[var(--brand-glow)]"
            >
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border border-white/15"
                />
              ) : (
                <span className="w-8 h-8 rounded-full btn-brand flex items-center justify-center text-xs font-bold text-white">
                  {user.email?.[0]?.toUpperCase() ?? 'U'}
                </span>
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="profile-menu"
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-2 w-56 rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow-lg)] p-2 z-50 origin-top-right"
                >
                  <div className="px-3 py-2.5 border-b border-[var(--border)] mb-1.5">
                    <p className="text-[13px] font-semibold truncate text-[var(--foreground)]">
                      {user.user_metadata?.full_name || 'Developer'}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)] truncate">{user.email}</p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="pressable flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[13px] font-medium text-[var(--foreground-secondary)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
                  >
                    <UserRound className="h-4 w-4" /> Profile
                  </Link>
                  <Link
                    href="/tasks"
                    onClick={() => setMenuOpen(false)}
                    className="pressable flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[13px] font-medium text-[var(--foreground-secondary)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
                  >
                    <ListChecks className="h-4 w-4" /> Job history
                  </Link>

                  <form action="/auth/signout" method="post" className="border-t border-[var(--border)] mt-1.5 pt-1.5">
                    <button
                      type="submit"
                      className="pressable w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-[13px] font-medium text-[var(--error)] hover:bg-[var(--error-soft)]"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={signInWithGitHub}
            title="Sign in with GitHub"
            className="btn-brand pressable flex items-center gap-2 rounded-full pl-3 pr-4 py-2 text-[13px] font-semibold mr-1"
          >
            <GithubIcon className="h-4 w-4 text-white" />
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
