"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)

    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+D shortcut to toggle dark/light mode dynamically
      if (e.key === 'D' || (e.shiftKey && e.key.toLowerCase() === 'd')) {
        setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTheme])

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full border border-[var(--border)]" />
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--foreground)] transition-colors"
      title="Toggle Light/Dark Theme (Shift+D)"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700" />
      )}
    </button>
  )
}
