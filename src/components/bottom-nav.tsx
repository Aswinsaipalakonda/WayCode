'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, CheckSquare, Settings, User } from 'lucide-react'

export function BottomNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  const pathname = usePathname()

  const navItems = [
    { label: 'Chat', href: '/', icon: MessageSquare },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Settings', action: onOpenSettings, icon: Settings },
    { label: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[var(--card)]/90 backdrop-blur-lg border-t border-[var(--border)] px-4 flex items-center justify-around select-none">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = item.href ? pathname === item.href : false

        if (item.action) {
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
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
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-[var(--primary)] font-bold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
