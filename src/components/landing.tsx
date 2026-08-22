'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import {
  Search,
  Home,
  History,
  FolderGit2,
  Settings2,
  Plus,
  ChevronRight,
  GitBranch,
  CheckCircle2,
  GitPullRequest,
  Zap,
  Terminal,
  Hammer,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { useGitHubAuth } from '@/lib/auth/github'
import { GithubIcon } from '@/components/icons'

const ease = [0.16, 1, 0.3, 1] as const
const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons'

function DevIcon({ slug, className }: { slug: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${DEVICON}/${slug}/${slug}-original.svg`}
      alt=""
      loading="lazy"
      className={className ?? 'h-6 w-6 object-contain'}
    />
  )
}

/* ============================================================ */
/* Hero app-window mockup                                        */
/* ============================================================ */
const BAR_HEIGHTS = [
  34, 52, 40, 66, 48, 58, 44, 72, 38, 56, 94, 86, 60, 42, 50, 62, 46, 68, 54,
  63, 45, 58, 71, 49, 57, 41,
]

const TASK_ROWS = [
  { id: 'waycode/task-a91f2c', repo: 'Skillvault-047', status: 'Completed', cls: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500', changes: '+142 −38' },
  { id: 'waycode/task-7c3d9e', repo: 'GramaVoice', status: 'Working', cls: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500', live: true, changes: '+26 −7' },
  { id: 'waycode/task-b52f08', repo: 'AswinSaii', status: 'Review ready', cls: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500', changes: '+64 −12' },
  { id: 'waycode/task-e11c44', repo: 'Skillvault-047', status: 'Failed', cls: 'bg-red-50 text-red-500', dot: 'bg-red-400', changes: '—' },
]

function AppWindowMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.85, ease }}
      className="relative"
    >
      {/* floating chips */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="absolute -left-4 -top-6 z-10 hidden items-center gap-2 rounded-2xl border border-black/[0.06] bg-white px-3.5 py-2.5 shadow-[0_16px_40px_-16px_rgba(26,30,40,0.3)] lg:flex"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </span>
        <div>
          <p className="text-[11px] font-bold leading-tight">Build verified</p>
          <p className="font-mono-code text-[9px] text-zinc-400">tsc --noEmit ✓ 0 errors</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.65, duration: 0.5, ease }}
        className="absolute -right-4 bottom-16 z-10 hidden items-center gap-1.5 rounded-full bg-[#14161c] px-3.5 py-2 shadow-[0_16px_40px_-14px_rgba(20,22,28,0.55)] lg:flex"
      >
        <GitPullRequest className="h-3.5 w-3.5 text-cyan-300" />
        <span className="font-mono-code text-[10px] text-slate-200">PR #42 opened</span>
      </motion.div>

      {/* window */}
      <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_60px_120px_-40px_rgba(26,30,40,0.35)]">
        {/* chrome */}
        <div className="flex items-center gap-3 border-b border-black/[0.05] bg-[#fafaf9] px-4 py-2.5">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto hidden items-center gap-1.5 rounded-md bg-black/[0.04] px-3 py-1 font-mono-code text-[10px] text-zinc-400 sm:flex">
            <Lock className="h-2.5 w-2.5" /> waycode.app
          </span>
          <span className="w-10" />
        </div>

        <div className="flex">
          {/* sidebar */}
          <aside className="hidden w-52 shrink-0 flex-col border-r border-black/[0.05] bg-[#fbfbfa] p-3 md:flex">
            <div className="flex items-center gap-2 px-1.5 pb-3">
              <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" />
              <span className="text-[13px] font-bold">WayCode</span>
            </div>
            <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 text-[11px] text-zinc-400">
              <Search className="h-3 w-3" /> Quick search…
            </div>
            {[
              { Icon: Home, label: 'Home' },
              { Icon: Plus, label: 'New Task' },
              { Icon: History, label: 'Job History' },
              { Icon: FolderGit2, label: 'Repositories' },
              { Icon: Settings2, label: 'Settings' },
            ].map(({ Icon, label }) => (
              <span
                key={label}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] ${
                  label === 'Home' ? 'bg-[var(--brand-soft)] font-semibold text-[var(--brand)]' : 'font-medium text-zinc-500'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </span>
            ))}
            <p className="mt-4 px-1.5 pb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
              Repositories · 3
            </p>
            {['Skillvault-047', 'GramaVoice', 'AswinSaii'].map((r) => (
              <span key={r} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-600">
                <GitBranch className="h-3 w-3 text-zinc-300" /> {r}
              </span>
            ))}
          </aside>

          {/* main */}
          <div className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold sm:text-sm">Task activity — last 14 days</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Daemon operational
              </span>
            </div>

            {/* legend */}
            <div className="mt-3 flex gap-3 text-[10px] font-medium text-zinc-400">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-zinc-200" /> Queued</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[var(--brand)]" /> Running</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-emerald-400" /> Verified</span>
            </div>

            {/* chart */}
            <div className="mt-3 flex h-32 items-end gap-[5px] sm:h-40">
              {BAR_HEIGHTS.map((h, i) => {
                const accent = i === 10 ? 'var(--brand)' : i === 11 ? '#e69600' : i === 12 ? 'var(--cyan)' : null
                return (
                  <motion.i
                    key={i}
                    initial={{ height: '6%' }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.028, duration: 0.55, ease }}
                    className={`w-full rounded-t-[4px] ${accent ? '' : 'bg-zinc-200/80'}`}
                    style={accent ? { background: accent } : undefined}
                  />
                )
              })}
            </div>
            <div className="mt-1.5 flex justify-between font-mono-code text-[8.5px] text-zinc-300">
              <span>Dec 15</span><span>Dec 22</span><span>Dec 29</span>
            </div>

            {/* table */}
            <div className="mt-5 overflow-hidden rounded-xl border border-black/[0.05]">
              <div className="hidden grid-cols-[1fr_90px_110px_80px] gap-2 border-b border-black/[0.05] bg-[#fafaf9] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400 sm:grid">
                <span>Task</span><span>Repo</span><span>Status</span><span className="text-right">Changes</span>
              </div>
              {TASK_ROWS.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-black/[0.04] px-3 py-2 last:border-0 sm:grid-cols-[1fr_90px_110px_80px]">
                  <span className="truncate font-mono-code text-[10.5px] text-zinc-600">{r.id}</span>
                  <span className="hidden truncate text-[10.5px] text-zinc-400 sm:block">{r.repo}</span>
                  <span className={`justify-self-end inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold sm:justify-self-start ${r.cls}`}>
                    <i className={`h-1.5 w-1.5 rounded-full ${r.dot} ${r.live ? 'animate-pulse' : ''}`} />
                    {r.status}
                  </span>
                  <span className="hidden text-right font-mono-code text-[10px] text-zinc-500 sm:block">{r.changes}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================ */
/* Sparkline                                                     */
/* ============================================================ */
function Sparkline({ points, stroke }: { points: string; stroke: string }) {
  return (
    <svg width="84" height="26" viewBox="0 0 84 26" fill="none">
      <polyline points={points} stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy={points.trim().split(' ').pop()!.split(',')[1]} r="2.4" fill={stroke} />
    </svg>
  )
}

/* ============================================================ */
/* Landing                                                       */
/* ============================================================ */
export function Landing() {
  const { signInWithGitHub } = useGitHubAuth()

  const githubBtn = (cls = 'btn-brand') => (
    <button onClick={signInWithGitHub} className={`${cls} pressable inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold`}>
      <GithubIcon className="h-4 w-4" />
      Start free with GitHub
    </button>
  )

  return (
    <div className="min-h-screen bg-[#ebebe8] text-[var(--foreground)] antialiased">
      {/* ================= DARK HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#14161c]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="relative h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/15">
              <Image src="/logo.png" alt="WayCode logo" width={32} height={32} className="h-full w-full object-cover" />
            </span>
            <span className="text-[17px] font-extrabold tracking-tight text-white">WayCode</span>
          </a>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-slate-400 md:flex">
            <a href="#overview" className="nav-link transition-colors hover:text-white">Overview</a>
            <a href="#features" className="nav-link transition-colors hover:text-white">Features</a>
            <a href="#how" className="nav-link transition-colors hover:text-white">How it works</a>
            <a href="#integrations" className="nav-link transition-colors hover:text-white">Integrations</a>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={signInWithGitHub} className="hidden text-[13px] font-medium text-slate-400 transition-colors hover:text-white sm:block">
              Log in
            </button>
            <button
              onClick={signInWithGitHub}
              className="pressable inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#14161c] transition-colors hover:bg-slate-200"
            >
              <GithubIcon className="h-4 w-4" />
              Sign in
            </button>
          </div>
        </div>
      </header>

      {/* ================= SHEET ================= */}
      <main className="mx-auto max-w-[1320px] sm:px-4 sm:pb-4">
        <div className="overflow-hidden bg-white sm:rounded-b-[32px] sm:rounded-t-none">
          {/* ---------- HERO ---------- */}
          <section id="top" className="relative px-5 pb-16 pt-16 sm:pt-24">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(58%_60%_at_50%_0%,rgba(10,102,255,0.08),transparent_70%)]" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="relative mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-1.5 text-[11px] font-semibold tracking-wide shadow-[var(--shadow-sm)]">
                <span className="rounded-full bg-[var(--brand)] px-1.5 py-px text-[9px] font-extrabold text-white">NEW</span>
                <span className="text-zinc-500">AUTONOMOUS ENGINEERING FOR GITHUB TEAMS</span>
              </span>

              <h1 className="mx-auto mt-6 max-w-2xl text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px] lg:text-[64px]">
                Take control of your codebase from anywhere.
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-zinc-500 sm:text-base">
                Dispatch engineering tasks in plain language. An autonomous agent clones, edits and verifies on its own branch —
                and nothing ships until you approve the diff from your phone.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {githubBtn()}
                <a
                  href="#overview"
                  className="pressable inline-flex items-center justify-center gap-1.5 rounded-full border border-black/[0.12] bg-white px-6 py-3.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  See how it works
                </a>
              </div>
            </motion.div>

            <div className="relative mx-auto mt-14 max-w-5xl sm:mt-20">
              <AppWindowMockup />
            </div>
          </section>

          {/* ---------- TECH STRIP ---------- */}
          <section className="border-t border-black/[0.05] px-5 py-10">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
              Built entirely on the modern dev stack
            </p>
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:gap-x-12">
              {[
                ['github', 'GitHub'],
                ['typescript', 'TypeScript'],
                ['nextjs', 'Next.js'],
                ['tailwindcss', 'Tailwind'],
                ['redis', 'Redis'],
                ['supabase', 'Supabase'],
                ['vercel', 'Vercel'],
                ['docker', 'Docker'],
              ].map(([slug, name]) => (
                <span key={slug} title={name} className="opacity-40 grayscale transition-all duration-300 hover:scale-110 hover:opacity-100 hover:grayscale-0">
                  <DevIcon slug={slug} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
                </span>
              ))}
            </div>
          </section>

          {/* ---------- OVERVIEW ---------- */}
          <section id="overview" className="scroll-mt-24 border-t border-black/[0.05] px-5 py-20 sm:py-28">
            <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }}>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">Overview</p>
                <h2 className="mt-4 max-w-md text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  Every task runs in the open — clone, edit, verify, wait for <em className="not-italic text-[var(--brand)]">you</em>.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
                  The daemon streams every tool-call and compiler line to your screen in real time. You see exactly what the
                  agent did — and only a build that passes reaches your review queue.
                </p>
                <div className="mt-7">{githubBtn('bg-[#14161c] text-white shadow-[0_10px_30px_-10px_rgba(20,22,28,0.5)] hover:bg-[#23262e]')}</div>
              </motion.div>

              {/* alert cards */}
              <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease }} className="relative hidden min-h-[260px] lg:block">
                <div aria-hidden className="absolute inset-x-8 bottom-0 top-8 rotate-[5deg] rounded-2xl border border-black/[0.06] bg-white shadow-sm" />
                <div className="absolute inset-x-0 top-0 -rotate-2 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_30px_60px_-25px_rgba(26,30,40,0.3)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-bold">Dec 28, 2026 · 06:12</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-red-500">
                      <i className="h-1.5 w-1.5 rounded-full bg-red-500" /> OVERNIGHT DIGEST
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] font-bold">Overnight run summary</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                    3 tasks completed across 2 repositories — zero failures, nothing pushed without you.
                  </p>
                  <div className="mt-4 space-y-1.5 border-t border-black/[0.05] pt-3 font-mono-code text-[10.5px]">
                    <p className="flex items-center justify-between"><span className="text-zinc-500">waycode/task-a91f2c</span><span className="font-semibold text-emerald-600">✓ shipped → PR #41</span></p>
                    <p className="flex items-center justify-between"><span className="text-zinc-500">waycode/task-7c3d9e</span><span className="font-semibold text-amber-600">● awaiting review</span></p>
                    <p className="flex items-center justify-between"><span className="text-zinc-500">waycode/task-b52f08</span><span className="font-semibold text-emerald-600">✓ build verified</span></p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* stat cards */}
            <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Median time-to-review', value: '3m 42s', delta: '▼ 41%', deltaCls: 'text-emerald-600 bg-emerald-50', points: '2,20 14,17 26,18.5 38,13 50,14 62,9 76,10 80,6', stroke: '#149e53' },
                { label: 'Self-heal recovery rate', value: '87%', delta: '▲ 6pts', deltaCls: 'text-emerald-600 bg-emerald-50', points: '2,21 14,19 26,15 38,16 50,11 62,12 76,7 80,5', stroke: '#0a66ff' },
                { label: 'Tasks shipped this month', value: '1,204', delta: '▲ 22%', deltaCls: 'text-emerald-600 bg-emerald-50', points: '2,22 14,20 26,17 38,15 50,13 62,10 76,8 80,4', stroke: '#00b7e8' },
                { label: 'Daemon uptime', value: '99.98%', delta: 'SLA', deltaCls: 'text-zinc-500 bg-zinc-100', points: '2,14 14,13.5 26,14 38,13 50,13.5 62,13 76,13.5 80,13', stroke: '#a1a1aa' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease }}
                  className="rounded-2xl border border-black/[0.06] bg-white p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">{s.label}</p>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[24px] font-extrabold tracking-tight">{s.value}</p>
                      <span className={`mt-1 inline-block rounded-full px-1.5 py-px text-[9px] font-bold ${s.deltaCls}`}>{s.delta}</span>
                    </div>
                    <Sparkline points={s.points} stroke={s.stroke} />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ---------- FEATURES BENTO ---------- */}
          <section id="features" className="scroll-mt-24 border-t border-black/[0.05] bg-[#fbfbfa] px-5 py-20 sm:py-28">
            <div className="mx-auto max-w-5xl">
              <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-xl text-center">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">Features</p>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">An agent you can audit,<br className="hidden sm:block" /> not a black box.</h2>
              </motion.div>

              <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Async — wide */}
                <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, ease }} className="card-surface rounded-[24px] p-6 lg:col-span-2">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="sm:w-2/5">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_6px_18px_-6px_var(--brand-glow)]">
                        <Zap className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 text-[16px] font-bold">Async by default</h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">Durable Redis queue, HTTP 202 in under 500ms. Lose signal, close the tab — the work continues.</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[
                        { id: 'task-a91f2c', repo: 'Skillvault-047', chip: 'verified', cls: 'bg-emerald-50 text-emerald-600' },
                        { id: 'task-7c3d9e', repo: 'GramaVoice', chip: 'running', cls: 'bg-blue-50 text-blue-600', live: true },
                        { id: 'task-b52f08', repo: 'AswinSaii', chip: 'queued · 84ms', cls: 'bg-zinc-100 text-zinc-500' },
                      ].map((q) => (
                        <div key={q.id} className="flex items-center justify-between rounded-xl border border-black/[0.05] bg-white px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate font-mono-code text-[10.5px] text-zinc-600">waycode/{q.id}</p>
                            <p className="text-[10px] text-zinc-400">{q.repo}</p>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${q.cls}`}>
                            {q.live && <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />} {q.chip}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.article>

                {/* Tool-calls */}
                <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay: 0.08, ease }} className="card-surface rounded-[24px] p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_6px_18px_-6px_var(--brand-glow)]">
                    <Terminal className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[16px] font-bold">Deterministic tool-calls</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">No free-form file writes — every change goes through auditable tools.</p>
                  <div className="mt-4 space-y-1.5 rounded-xl bg-[var(--term-bg)] p-3 font-mono-code text-[10px]">
                    <p className="text-sky-300">read_file src/api/checkout.ts</p>
                    <p className="text-teal-300">edit_file src/api/checkout.ts <span className="text-slate-400">+18 −4</span></p>
                    <p className="text-slate-400">list_files → 214 entries</p>
                  </div>
                </motion.article>

                {/* Self-heal */}
                <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, ease }} className="card-surface rounded-[24px] p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_6px_18px_-6px_var(--brand-glow)]">
                    <Hammer className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[16px] font-bold">Self-healing builds</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">Compiler errors feed straight back for bounded fix attempts.</p>
                  <div className="mt-4 space-y-1.5 font-mono-code text-[10px]">
                    <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-red-500">✗ TS2345: &apos;string&apos; not assignable</p>
                    <p className="text-center text-zinc-300">↓ self-heal 1/3</p>
                    <p className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-600">✓ tsc --noEmit · 0 errors</p>
                  </div>
                </motion.article>

                {/* Approval — wide */}
                <motion.article initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay: 0.08, ease }} className="card-surface rounded-[24px] p-6 lg:col-span-2">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="sm:w-2/5">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_6px_18px_-6px_var(--brand-glow)]">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 text-[16px] font-bold">Human-approved pushes</h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">Review the unified diff, tap once — the branch lands as a pull request. Never a silent push to main.</p>
                    </div>
                    <div className="flex-1 rounded-2xl border border-black/[0.05] bg-white p-4">
                      <div className="flex items-center justify-between font-mono-code text-[10.5px]">
                        <span className="font-semibold text-zinc-600">checkout.ts</span>
                        <span><span className="text-emerald-600">+18</span> <span className="text-red-500">−4</span></span>
                      </div>
                      <div className="mt-2.5 space-y-1 font-mono-code text-[9.5px]">
                        <p className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">+ if (cart?.items?.length) &#123;&#125;</p>
                        <p className="rounded bg-red-50 px-2 py-0.5 text-red-500">− if (cart.items.length) &#123;&#125;</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <span className="flex-1 rounded-full border border-black/[0.1] py-1.5 text-center text-[10px] font-bold text-zinc-500">Reject</span>
                        <span className="btn-brand flex-1 rounded-full py-1.5 text-center text-[10px] font-bold">Approve &amp; push</span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              </div>
            </div>
          </section>

          {/* ---------- HOW IT WORKS ---------- */}
          <section id="how" className="scroll-mt-24 border-t border-black/[0.05] px-5 py-20 sm:py-28">
            <div className="mx-auto max-w-5xl">
              <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }} className="max-w-xl">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">How it works</p>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Three taps between idea<br className="hidden sm:block" /> and pull request.</h2>
              </motion.div>

              <div className="relative mt-12 space-y-9 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-gradient-to-b before:from-[var(--brand)] before:via-[var(--cyan)] before:to-transparent">
                {[
                  { n: '01', t: 'Describe the change', c: '"Fix the null check in checkout.ts" — plain language, any repo you own.' },
                  { n: '02', t: 'The daemon goes to work', c: 'It clones, plans, edits through tool-calls and heals its own build errors on an isolated waycode/task-* branch.' },
                  { n: '03', t: 'Review and ship', c: 'A clean diff lands on your phone. Approve it and WayCode pushes the branch and opens the pull request.' },
                ].map((s, i) => (
                  <motion.div key={s.n} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.1, ease }} className="relative flex gap-5">
                    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-[11px] font-extrabold text-white shadow-[0_6px_16px_-4px_var(--brand-glow)]">
                      {s.n.slice(1)}
                    </span>
                    <div className="pt-0.5">
                      <h3 className="text-[15px] font-bold">{s.t}</h3>
                      <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-zinc-500">{s.c}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- INTEGRATIONS ---------- */}
          <section id="integrations" className="scroll-mt-24 overflow-hidden border-t border-black/[0.05] bg-[#fbfbfa] px-5 py-20 sm:py-28">
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">Integrations</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Plugs into the stack you already use.</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                GitHub OAuth with least-privilege scopes, encrypted BYOK for any model provider, Supabase Realtime telemetry.
              </p>
            </motion.div>

            <div className="relative mx-auto mt-14 h-[320px] max-w-3xl sm:h-[380px]">
              {/* connecting lines */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                {[
                  [12, 10], [31, 10], [50, 10], [69, 10], [88, 10],
                  [18, 86], [39.3, 86], [60.7, 86], [82, 86],
                ].map(([x, y], i) => (
                  <line key={i} x1={x} y1={y} x2="50" y2="48" stroke="#d9d9d6" strokeWidth="0.3" />
                ))}
              </svg>

              {/* top nodes */}
              {[
                { slug: 'github', x: 12, y: 10, hide: false },
                { slug: 'typescript', x: 31, y: 10, hide: false },
                { slug: 'nextjs', x: 50, y: 10, hide: false },
                { slug: 'tailwindcss', x: 69, y: 10, hide: false },
                { slug: 'vercel', x: 88, y: 10, hide: false },
              ].map((n) => (
                <span
                  key={n.slug}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.07] bg-white shadow-[0_10px_28px_-12px_rgba(26,30,40,0.3)] sm:h-14 sm:w-14"
                  title={n.slug}
                >
                  <DevIcon slug={n.slug} className="h-5 w-5 object-contain sm:h-6 sm:w-6" />
                </span>
              ))}

              {/* bottom nodes */}
              {[
                { slug: 'redis', x: 18, y: 86 },
                { slug: 'supabase', x: 39.3, y: 86 },
                { slug: 'docker', x: 60.7, y: 86 },
                { slug: 'github', x: 82, y: 86, alt: 'github' },
              ].slice(0, 4).map((n, i) => (
                <span
                  key={n.slug + i}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.07] bg-white shadow-[0_10px_28px_-12px_rgba(26,30,40,0.3)] sm:h-14 sm:w-14 ${i === 1 || i === 2 ? '' : 'hidden sm:flex'}`}
                  title={n.slug}
                >
                  <DevIcon slug={n.slug === 'github' && n.alt ? 'vercel' : n.slug} className="h-5 w-5 object-contain sm:h-6 sm:w-6" />
                </span>
              ))}

              {/* center node */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5, ease }}
                style={{ left: '50%', top: '48%' }}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl bg-[#14161c] px-4 py-3 shadow-[0_24px_50px_-18px_rgba(20,22,28,0.6)] ring-1 ring-white/10"
              >
                <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" />
                <span className="text-[13px] font-extrabold text-white">WayCode</span>
              </motion.div>
            </div>
          </section>

          {/* ---------- PERSONAS ---------- */}
          <section className="border-t border-black/[0.05] px-5 py-20 sm:py-28">
            <div className="mx-auto max-w-5xl">
              <motion.p initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }} className="max-w-lg text-[15px] font-semibold leading-snug">
                See how developers use WayCode to ship faster, stay unblocked, <span className="text-[var(--brand)]">and keep humans in control</span>.
              </motion.p>
              <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
                {[
                  { who: 'THE ASYNC MAINTAINER', what: 'Clears the issue backlog between meetings — triage, fixes and dependency bumps without opening a laptop.' },
                  { who: 'SOLO FOUNDERS', what: 'Ships landing tweaks from the beach. The daemon handles clone, build and PR while they stay in flow elsewhere.' },
                  { who: 'ENGINEERING MANAGERS', what: 'Full audit trail of every autonomous change — who approved what, when, with the complete log stream attached.' },
                ].map((p, i) => (
                  <motion.div key={p.who} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay: i * 0.09, ease }}>
                    <ChevronRight className="h-4 w-4 text-[var(--brand)]" />
                    <p className="mt-3 text-[15px] font-extrabold tracking-wide">{p.who}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{p.what}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- QUOTE ---------- */}
          <section className="border-t border-black/[0.05] px-5 py-24 text-center">
            <motion.blockquote initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-2xl">
              <p className="text-[22px] font-semibold leading-snug tracking-tight sm:text-[27px]">
                “Nothing is lost. Nothing ships silently.”
              </p>
              <footer className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                The two guarantees WayCode runs on
              </footer>
            </motion.blockquote>
          </section>

          {/* ---------- CTA ---------- */}
          <section className="px-5 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease }}
              className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 rounded-[32px] border border-black/[0.05] bg-gradient-to-br from-[#eaf1ff] via-white to-[#fff6ea] p-8 sm:p-14 lg:grid-cols-2"
            >
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-[44px] sm:leading-[1.08]">
                  Get started in <span className="text-[var(--brand)]">minutes,</span><br />
                  <span className="text-zinc-400">not months.</span>
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
                  Connect GitHub, bring your own key — free-tier models work out of the box — and dispatch your first task today.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  {githubBtn('bg-[#14161c] text-white shadow-[0_10px_30px_-10px_rgba(20,22,28,0.5)] hover:bg-[#23262e]')}
                </div>
                <p className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
                  <Lock className="h-3 w-3" /> AES-256-GCM key vault · never returned in plaintext
                </p>
              </div>

              <div className="rotate-1 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_40px_80px_-30px_rgba(26,30,40,0.35)]">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold">Agent · Skillvault-047</p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">SHIPPED</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="flex flex-1 items-center gap-1.5">
                      <i className={`h-2.5 w-2.5 rounded-full ${i < 3 ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
                      <i className={`h-1 flex-1 rounded-full ${i < 3 ? 'bg-gradient-to-r from-[var(--brand)] to-[var(--cyan)]' : 'bg-transparent'}`} />
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between font-mono-code text-[10px] text-zinc-400">
                  <span>queued → generating → verifying → review</span>
                </div>
                <div className="mt-4 rounded-xl border border-black/[0.05] p-3">
                  <div className="flex items-center justify-between font-mono-code text-[10px]">
                    <span className="text-zinc-500">README.md</span>
                    <span><span className="text-emerald-600">+12</span> <span className="text-red-500">−2</span></span>
                  </div>
                  <p className="mt-2 rounded bg-emerald-50 px-2 py-0.5 font-mono-code text-[9.5px] text-emerald-700">+ [![Built with WayCode]](…)</p>
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </main>

      {/* ================= DARK FOOTER ================= */}
      <footer className="bg-[#14161c] text-slate-400">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <span className="relative h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/15">
                  <Image src="/logo.png" alt="" width={32} height={32} className="h-full w-full object-cover" />
                </span>
                <span className="text-[16px] font-extrabold text-white">WayCode</span>
              </div>
              <p className="mt-3 max-w-[220px] text-[12px] leading-relaxed">
                An async gateway between your phone and an autonomous engineering agent.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold">
                <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> All systems operational
              </span>
            </div>

            {[
              { h: 'PRODUCT', links: [['Features', '#features'], ['How it works', '#how'], ['Integrations', '#integrations'], ['Overview', '#overview']] },
              { h: 'RESOURCES', links: [['Documentation', '#top'], ['Changelog', '#top'], ['Status', '#top']] },
              { h: 'COMPANY', links: [['About', '#top'], ['Contact support', '#top'], ['Privacy', '#top']] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{col.h}</p>
                <ul className="mt-4 space-y-2.5 text-[13px]">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="transition-colors hover:text-white">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.08] pt-6 sm:flex-row">
            <p className="text-[11px]">© 2026 WayCode · All rights reserved</p>
            <a
              href="https://github.com/Aswinsaipalakonda/WayCode"
              target="_blank"
              rel="noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 transition-colors hover:border-white/30 hover:text-white"
              aria-label="GitHub repository"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
