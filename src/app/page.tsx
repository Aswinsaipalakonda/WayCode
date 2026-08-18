import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Bot, Terminal, Code2, Sparkles, Shield, ArrowRight } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let repositories = []
  if (user) {
    const { data } = await supabase
      .from('repositories')
      .select('*')
      .order('created_at', { ascending: false })
    repositories = data || []
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <Header user={user} repositories={repositories} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold mb-6 border border-[var(--primary)]/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intent-Driven Mobile Gateway v1.0</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 max-w-2xl leading-tight">
          Offload Code Tasks from Mobile to Cloud AI Daemon
        </h1>

        <p className="text-sm md:text-base text-[var(--muted-foreground)] max-w-xl mb-8 leading-relaxed">
          Describe what you want WayCode to build or fix in natural language. Heavy compute runs asynchronously on your VPS daemon; you review and approve diffs on mobile.
        </p>

        {user ? (
          <div className="w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[var(--primary)]" />
                Mobile Composer
              </span>
              <span className="text-[10px] text-emerald-500 font-medium">⚡ Connected</span>
            </div>

            <textarea
              placeholder="Describe your task (e.g. 'Add a Supabase Auth hook and wrap checkout routes in RLS')..."
              rows={3}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 text-sm text-[var(--foreground)] outline-hidden focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />

            <button className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">
              <span>Submit Intent (202 Accepted)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left mt-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
              <Code2 className="w-6 h-6 text-[var(--primary)]" />
              <h3 className="font-bold text-sm">Full Repo Authorization</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                OAuth requests explicit <code className="bg-[var(--muted)] px-1 py-0.5 rounded text-[11px]">repo</code> write permissions for seamless branching and PR creation.
              </p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
              <Bot className="w-6 h-6 text-[var(--primary)]" />
              <h3 className="font-bold text-sm">BYOK Model Vault</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Bring your own OpenRouter or Gemini API keys. Access zero-cost free models natively.
              </p>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-2">
              <Shield className="w-6 h-6 text-[var(--primary)]" />
              <h3 className="font-bold text-sm">Human Oversight</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Review unified diffs on mobile before code is pushed to production branches.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
