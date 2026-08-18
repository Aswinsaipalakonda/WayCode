import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { BottomNav } from '@/components/bottom-nav'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { Mail, GitBranch, Shield, LogOut } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/')
  }

  const { data: repositories } = await supabase
    .from('repositories')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col pb-20 md:pb-0">
      <Header user={user} repositories={repositories || []} />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-8 space-y-6 animate-in slide-in-from-right duration-300">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-xl space-y-6">
          {/* User Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-[var(--border)]">
            {user.user_metadata?.avatar_url ? (
              <Image
                src={user.user_metadata.avatar_url}
                alt="User Avatar"
                width={64}
                height={64}
                className="rounded-full border-2 border-[var(--primary)] shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--primary)] text-white text-2xl font-bold flex items-center justify-center shadow-md">
                {user.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}

            <div>
              <h1 className="text-xl font-bold">{user.user_metadata?.full_name || 'WayCode Developer'}</h1>
              <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                <GitBranch className="w-3.5 h-3.5" />
                @{user.user_metadata?.user_name || 'developer'}
              </p>
            </div>
          </div>

          {/* Details Form & Settings */}
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                Appearance & Theme Mode
              </label>
              <div className="flex items-center justify-between bg-[var(--background)] border border-[var(--border)] rounded-2xl p-3 text-[var(--foreground)]">
                <span className="font-semibold">Toggle Color Scheme</span>
                <ModeToggle />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                Email Address
              </label>
              <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-2xl p-3 text-[var(--foreground)]">
                <Mail className="w-4 h-4 text-[var(--primary)]" />
                <span>{user.email}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                Connected Repositories
              </label>
              <div className="flex items-center justify-between bg-[var(--background)] border border-[var(--border)] rounded-2xl p-3 text-[var(--foreground)]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span>{repositories?.length || 0} Repositories Synced</span>
                </div>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full font-semibold">
                  OAuth Active
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out Trigger */}
          <form action="/auth/signout" method="post" className="pt-4 border-t border-[var(--border)]">
            <button
              type="submit"
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-xs py-3 rounded-full transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              Sign Out Account
            </button>
          </form>
        </div>
      </main>

      {/* Mobile 4-Tab Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
