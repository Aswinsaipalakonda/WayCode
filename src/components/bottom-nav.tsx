'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { House, ListChecks, Settings2, UserRound } from 'lucide-react'
import { SettingsDrawer } from '@/components/settings-drawer'

export function BottomNav() {
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <nav
        className="fixed inset-x-0 z-40 md:hidden px-4 bottom-[max(12px,env(safe-area-inset-bottom))]"
        aria-label="Primary"
      >
        <div className="flex items-center gap-1 rounded-[32px] border border-black/[0.06] bg-white/95 backdrop-blur-xl px-2 py-2 shadow-[0_18px_50px_-16px_rgba(26,30,40,0.35)]">
          <NavLink href="/" label="Home" icon={House} active={pathname === '/'} />
          <NavLink href="/tasks" label="Jobs" icon={ListChecks} active={pathname === '/tasks'} />
          <NavItemButton label="Settings" icon={Settings2} onClick={() => setSettingsOpen(true)} />
          <NavLink href="/profile" label="Profile" icon={UserRound} active={pathname === '/profile'} />
        </div>
      </nav>

      <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="pressable relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2.5"
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          transition={{ type: 'spring', stiffness: 430, damping: 34 }}
          className="absolute inset-x-1 inset-y-0 rounded-full bg-[#17191f] shadow-[0_6px_18px_-6px_rgba(23,25,31,0.55)]"
        />
      )}
      <Icon
        className={`relative h-[19px] w-[19px] transition-colors duration-200 ${
          active ? 'text-white' : 'text-[var(--muted-foreground)]'
        }`}
        strokeWidth={active ? 2.3 : 2}
      />
      <span
        className={`relative text-[10.5px] font-semibold tracking-wide transition-colors duration-200 ${
          active ? 'text-white' : 'text-[var(--muted-foreground)]'
        }`}
      >
        {label}
      </span>
    </Link>
  )
}

function NavItemButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="pressable relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2.5"
    >
      <Icon className="h-[19px] w-[19px] text-[var(--muted-foreground)]" strokeWidth={2} />
      <span className="text-[10.5px] font-semibold tracking-wide text-[var(--muted-foreground)]">
        {label}
      </span>
    </button>
  )
}

