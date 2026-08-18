'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, LogIn, LogOut } from 'lucide-react'
import { useGitHubAuth } from '@/lib/auth/github'
import { SettingsDrawer } from '@/components/settings-drawer'
import { ModeToggle } from '@/components/mode-toggle'

interface Repository {
  id: string
  repo_name: string
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
  onToggleSidebar?: () => void
}

export function Header({ user, onToggleSidebar }: HeaderProps) {
  const { signInWithGitHub, signOut } = useGitHubAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-14 bg-[var(--card)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 flex items-center justify-between">
        {/* Left: Mobile Hamburger Toggle + Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="WayCode Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span className="font-bold text-base tracking-tight text-[var(--foreground)] flex items-center gap-1.5">
              WayCode
              <span className="text-[9px] bg-[var(--primary)]/15 text-[var(--primary)] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Gateway
              </span>
            </span>
          </Link>
        </div>

        {/* Right Actions: Mode Toggle & Profile Avatar */}
        <div className="flex items-center gap-2">
          {/* Shadcn Theme Mode Toggle */}
          <ModeToggle />

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
              {/* Profile Avatar Button -> Navigates to /profile */}
              <Link
                href="/profile"
                className="relative hover:opacity-80 transition-opacity"
                title="User Profile & Settings"
              >
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="User Avatar"
                    width={32}
                    height={32}
                    className="rounded-full border border-[var(--primary)] shadow-xs"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
              </Link>

              <button
                onClick={signOut}
                className="p-1.5 text-xs text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
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
