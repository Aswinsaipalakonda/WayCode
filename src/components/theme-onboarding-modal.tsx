"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function ThemeOnboardingModal() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if user has already selected a preference in onboarding
    const onboardingDone = localStorage.getItem("waycode_theme_onboarded")
    if (!onboardingDone) {
      setIsOpen(true)
    }
  }, [])

  const selectTheme = (chosenTheme: "light" | "dark") => {
    setTheme(chosenTheme)
    localStorage.setItem("waycode_theme_onboarded", "true")
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200 p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 max-w-sm w-full text-center space-y-6 shadow-2xl">
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">Welcome to WayCode</h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Please choose your preferred theme appearance to continue.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => selectTheme("light")}
            className="flex flex-col items-center justify-center p-5 rounded-full border border-[var(--border)] bg-white text-slate-900 hover:scale-105 transition-all shadow-md"
          >
            <Sun className="w-6 h-6 text-amber-500 mb-2" />
            <span className="text-xs font-bold">Light Mode</span>
          </button>

          <button
            onClick={() => selectTheme("dark")}
            className="flex flex-col items-center justify-center p-5 rounded-full border border-[var(--border)] bg-slate-950 text-white hover:scale-105 transition-all shadow-md"
          >
            <Moon className="w-6 h-6 text-sky-400 mb-2" />
            <span className="text-xs font-bold">Dark Mode</span>
          </button>
        </div>
      </div>
    </div>
  )
}
