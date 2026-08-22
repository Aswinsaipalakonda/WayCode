import { createClient } from '@/lib/supabase/server'
import { AppChrome } from '@/components/app-chrome'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { Mail, GitBranch, LogOut, AtSign, BadgeCheck } from 'lucide-react'
import { GithubIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

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

  const rowCls =
    'flex items-center justify-between gap-3 rounded-[22px] border border-black/[0.05] bg-white/90 p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-black/[0.09] hover:bg-white'

  return (
    <AppChrome user={user} initialRepositories={repositories || []}>
      <div className="h-full overflow-y-auto pb-28 md:pb-10">
        <main className="anim-slide-right mx-auto w-full max-w-xl space-y-5 px-4 pt-5 sm:px-6">
          <div className="anim-fade-up pt-1">
            <h1 className="text-[26px] font-bold tracking-tight sm:text-3xl">
              <span className="text-gradient-brand">Profile</span>
            </h1>
            <p className="mt-1 text-[13px] text-[var(--foreground-secondary)] sm:text-sm">
              Your account and connected sources.
            </p>
          </div>

          {/* Identity card */}
          <div className="anim-fade-up stagger-2 relative overflow-hidden rounded-[30px] border border-black/[0.05] bg-white/90 p-6 shadow-[var(--shadow-md)] backdrop-blur">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-gradient-to-br from-[rgba(10,102,255,0.12)] to-[rgba(0,183,232,0.12)] blur-2xl"
            />
            <div className="relative flex items-center gap-4">
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt=""
                  width={60}
                  height={60}
                  className="rounded-[20px] border border-black/10 shadow-[var(--shadow-md)]"
                />
              ) : (
                <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[20px] btn-brand text-xl font-extrabold">
                  {user.email?.[0]?.toUpperCase() ?? 'U'}
                </span>
              )}

              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 truncate text-[17px] font-bold tracking-tight">
                  {user.user_metadata?.full_name || 'WayCode Developer'}
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                </h2>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                  <AtSign className="h-3 w-3" />
                  {user.user_metadata?.user_name || 'developer'}
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--success)]">
                  <span className="live-dot" style={{ width: 6, height: 6 }} />
                  Signed in
                </span>
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="anim-fade-up stagger-3 space-y-2.5">
            <p className="px-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              Account
            </p>

            <div className={rowCls}>
              <span className="flex items-center gap-2.5 text-[13px] font-semibold">
                <span className="rounded-xl bg-[var(--brand-soft)] p-2 text-[var(--brand)]">
                  <Mail className="h-4 w-4" />
                </span>
                Email
              </span>
              <span className="truncate text-xs text-[var(--foreground-secondary)]">{user.email}</span>
            </div>

            <div className={rowCls}>
              <span className="flex items-center gap-2.5 text-[13px] font-semibold">
                <span className="rounded-xl bg-[var(--success-soft)] p-2 text-[var(--success)]">
                  <GitBranch className="h-4 w-4" />
                </span>
                Repositories
              </span>
              <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--success)]">
                {(repositories?.length || 0) + ' connected'}
              </span>
            </div>

            {/* Security — with the original GitHub mark */}
            <div className={rowCls}>
              <span className="flex items-center gap-2.5 text-[13px] font-semibold">
                <span className="rounded-xl bg-[#f0f1f3] p-2 text-[#24292f]">
                  <GithubIcon className="h-4 w-4" />
                </span>
                Security
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(36,41,47,0.07)] px-2.5 py-1 text-[10px] font-bold text-[#24292f]">
                <GithubIcon className="h-3 w-3" />
                GitHub OAuth
              </span>
            </div>
          </div>

          {/* Sign out */}
          <form action="/auth/signout" method="post" className="anim-fade-up stagger-4">
            <button
              type="submit"
              className="pressable flex w-full items-center justify-center gap-2 rounded-full border border-[var(--error)]/25 bg-white/80 py-3.5 text-[13px] font-bold text-[var(--error)] shadow-[var(--shadow-sm)] backdrop-blur hover:bg-[var(--error)] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </main>
      </div>
    </AppChrome>
  )
}
