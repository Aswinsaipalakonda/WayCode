'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { ChatCanvas } from '@/components/chat-canvas'
import { BottomNav } from '@/components/bottom-nav'
import { SettingsDrawer } from '@/components/settings-drawer'
import { ThemeOnboardingModal } from '@/components/theme-onboarding-modal'

interface Repository {
  id: string
  repo_name: string
  default_branch: string
}

interface MainLayoutProps {
  user: any
  initialRepositories: Repository[]
}

export function MainLayout({ user, initialRepositories }: MainLayoutProps) {
  const [repositories, setRepositories] = useState<Repository[]>(initialRepositories)
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(
    initialRepositories.length > 0 ? initialRepositories[0] : null
  )
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleSyncRepos = async () => {
    try {
      const res = await fetch('/api/repos/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.repos) {
        setRepositories(data.repos)
        if (data.repos.length > 0 && !selectedRepo) {
          setSelectedRepo(data.repos[0])
        }
      }
    } catch (e) {
      console.error('Failed to sync repositories:', e)
    }
  }

  return (
    <div className="h-screen w-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col overflow-hidden">
      {/* Header Bar */}
      <Header
        user={user}
        repositories={repositories}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Workspace Two-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar (Antigravity 2.0 Style) */}
        <div className="hidden md:block">
          <Sidebar
            repositories={repositories}
            selectedRepo={selectedRepo}
            onSelectRepo={(repo) => setSelectedRepo(repo)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSyncRepos={handleSyncRepos}
          />
        </div>

        {/* Mobile Slide-over Drawer Sidebar */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative z-10 w-72 h-full bg-[var(--card)] shadow-2xl animate-in slide-in-from-left duration-300">
              <Sidebar
                repositories={repositories}
                selectedRepo={selectedRepo}
                onSelectRepo={(repo) => {
                  setSelectedRepo(repo)
                  setIsSidebarOpen(false)
                }}
                onOpenSettings={() => {
                  setIsSettingsOpen(true)
                  setIsSidebarOpen(false)
                }}
                onSyncRepos={handleSyncRepos}
              />
            </div>
          </div>
        )}

        {/* Center Chat Canvas */}
        <main className="flex-1 h-full flex flex-col overflow-hidden">
          <ChatCanvas
            repositories={repositories}
            selectedRepo={selectedRepo}
            onSelectRepo={(repo) => setSelectedRepo(repo)}
          />
        </main>
      </div>

      {/* Mobile 4-Tab Bottom Navigation Bar */}
      <BottomNav onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* BYOK Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Theme Onboarding Modal for First Time Logins */}
      <ThemeOnboardingModal />
    </div>
  )
}
