'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, CheckSquare, Settings, User } from 'lucide-react'
import { SettingsDrawer } from '@/components/settings-drawer'

export function BottomNav({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleSettingsClick = () => {
    if (onOpenSettings) {
      onOpenSettings()
    } else {
      setIsSettingsOpen(true)
    }
  }

  const navItems = [
    { label: 'Chat', href: '/', icon: MessageSquare },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Settings', action: handleSettingsClick, icon: Settings },
    { label: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[var(--card)]/95 backdrop-blur-lg border-t border-[var(--border)] px-4 flex items-center justify-around select-none shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href ? pathname === item.href : false

          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all ${
                isActive
                  ? 'text-[var(--primary)] font-bold scale-105'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  )
}
