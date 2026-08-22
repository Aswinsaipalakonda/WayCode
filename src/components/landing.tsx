'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'motion/react'
import {
  Zap,
  Terminal,
  Hammer,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  GitPullRequest,
  Lock,
} from 'lucide-react'
import { SiOpenrouter, SiGooglegemini } from 'react-icons/si'
import { TbApi } from 'react-icons/tb'
import { useGitHubAuth } from '@/lib/auth/github'
import { GithubIcon } from '@/components/icons'

const WORK_IMG =
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1600&auto=format&fit=crop'

const ease = [0.16, 1, 0.3, 1] as const

/* ============================================================ */
/* Animated counter                                              */
/* ============================================================ */
function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const dur = 1400
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])

  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  )
}

/* ============================================================ */
/* Feature card with mouse-follow glow                           */
/* ============================================================ */
function GlowCard({
  Icon,
  title,
  copy,
  index,
}: {
  Icon: typeof Zap
  title: string
  copy: string
  index: number
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      className="card-surface group relative overflow-hidden rounded-[24px] p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%), rgba(10,102,255,0.09), transparent 65%)',
        }}
      />
      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_6px_18px_-6px_var(--brand-glow)] transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="relative mt-4 text-[15px] font-bold">{title}</h3>
      <p className="relative mt-2 text-[13px] leading-relaxed text-[var(--foreground-secondary)]">{copy}</p>
    </motion.article>
  )
}

/* ============================================================ */
/* Interactive phone demo — auto-playing task lifecycle          */
/* ============================================================ */
const STAGE_LABELS = ['Prompt', 'Queued', 'Working', 'Verify', 'Review', 'Shipped']
const STAGE_DURATIONS = [750, 1000, 1300, 1500, 1300, 1200]

const LOG_LINES = [
  { cls: 'text-slate-500', text: '$ git clone --depth 1 ✓ 1.2s' },
  { cls: 'text-sky-600', text: 'read_file src/api/checkout.ts' },
  { cls: 'text-teal-600', text: 'edit_file src/api/checkout.ts +12 −3' },
  { cls: 'text-emerald-600', text: 'tsc --noEmit ✓ 0 errors' },
]

function PhoneDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-80px' })
  const startedRef = useRef(false)
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (inView && !startedRef.current) {
      startedRef.current = true
      setPlaying(true)
    }
  }, [inView])

  useEffect(() => {
    if (!playing || stage >= STAGE_LABELS.length) return
    const t = setTimeout(() => setStage((s) => s + 1), STAGE_DURATIONS[stage])
    return () => clearTimeout(t)
  }, [playing, stage])

  const jumpTo = (i: number) => {
    setStage(i + 1)
    setPlaying(false)
  }
  const replay = () => {
    setStage(0)
    setPlaying(true)
  }

  // Derived demo state
  const activeStep = Math.min(Math.max(stage - 2, 0), 3)
  const allDone = stage >= 6
  const badge =
    stage >= 6
      ? { label: 'SHIPPED', cls: 'bg-[var(--success-soft)] text-[var(--success)]' }
      : stage >= 5
        ? { label: 'REVIEW', cls: 'bg-[var(--warning-soft)] text-[var(--warning)]' }
        : stage >= 3
          ? { label: 'WORKING', cls: 'bg-[var(--brand-soft)] text-[var(--brand)]' }
          : { label: 'QUEUED', cls: 'bg-black/[0.06] text-[#585e68]' }

  return (
    <div ref={ref} className="relative mx-auto w-[290px] sm:w-[320px]">
      {/* Frame */}
      <div className="overflow-hidden rounded-[44px] border-[10px] border-[#14161c] bg-white shadow-[0_48px_90px_-32px_rgba(10,20,40,0.4)]">
        <div className="flex items-center justify-between px-6 pt-2.5 text-[9px] font-semibold text-slate-400">
          <span>9:41</span>
          <span className="tracking-tighter">●●●●</span>
        </div>
        <div className="flex items-center gap-2 border-b border-black/5 px-4 py-2.5">
          <Image src="/logo.png" alt="" width={20} height={20} className="rounded-md" />
          <span className="text-[12px] font-bold">WayCode</span>
        </div>

        <div className="min-h-[400px] space-y-3 bg-[#f7f5f0] px-3 py-4">
          <AnimatePresence>
            {stage >= 1 && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-[18px] rounded-br-md bg-[var(--brand)] px-3 py-2 text-[11px] font-medium leading-snug text-white shadow-sm">
                  Fix the null check in checkout API before Friday 🚀
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {stage >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="rounded-2xl border border-black/[0.05] bg-white p-3 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br ${allDone ? 'from-emerald-400 to-emerald-500' : 'from-[var(--brand)] to-[var(--cyan)]'} p-px`}>
                    <span className="flex h-full w-full items-center justify-center rounded-[5px] bg-white">
                      <Image src="/logo.png" alt="" width={10} height={10} />
                    </span>
                  </span>
                  Agent
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold tracking-wide ${badge.cls}`}>
                  {(stage === 3 || stage === 4) && <span className="live-dot" style={{ width: 4, height: 4 }} />}
                  {badge.label}
                </span>
              </div>

              {/* mini pipeline */}
              <div className="relative mt-3 flex items-start justify-between px-0.5">
                <div className="absolute left-[8%] right-[8%] top-[5px] h-[2px] rounded bg-black/[0.07]">
                  <motion.div
                    animate={{ width: `${(activeStep / 3) * 100}%` }}
                    transition={{ duration: 0.6, ease }}
                    className={`h-full rounded-full ${allDone ? 'bg-emerald-400' : 'bg-gradient-to-r from-[var(--brand)] to-[var(--cyan)]'}`}
                  />
                </div>
                {[0, 1, 2, 3].map((i) => {
                  const done = allDone || i < activeStep
                  const current = !allDone && i === activeStep
                  return (
                    <span key={i} className="relative z-10 flex h-[11px] w-[11px] items-center justify-center rounded-full border-2 bg-white"
                      style={{
                        borderColor: done ? 'transparent' : current ? 'var(--brand)' : 'rgba(0,0,0,0.1)',
                        background: done ? (allDone ? '#34d399' : 'var(--brand)') : '#fff',
                      }}
                    >
                      {current && <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[var(--brand)]" />}
                    </span>
                  )
                })}
              </div>

              {/* terminal */}
              <div className="mt-3 min-h-[74px] overflow-hidden rounded-xl bg-[var(--term-bg)] p-2.5 font-mono-code text-[9px] leading-relaxed">
                {LOG_LINES.slice(0, stage >= 4 ? LOG_LINES.length : 0).map((l, i) => (
                  <motion.p key={l.text} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.28 }}>
                    <span className={l.cls}>{l.text}</span>
                  </motion.p>
                ))}
                {stage >= 3 && stage < 4 && (
                  <p className="flex items-center gap-1.5 text-cyan-300">
                    working<span className="term-caret" />
                  </p>
                )}
              </div>

              {/* diff + actions */}
              <AnimatePresence>
                {stage >= 5 && !allDone && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-2.5 py-1.5">
                      <span className="font-mono-code text-[9px] font-semibold text-[var(--foreground-secondary)]">1 file changed</span>
                      <span className="font-mono-code text-[9px] font-bold"><span className="text-emerald-600">+12</span> <span className="text-red-500">−3</span></span>
                    </div>
                    <button className="btn-brand pressable mt-2 w-full rounded-xl py-2 text-[10px] font-bold">
                      Review changes
                    </button>
                  </motion.div>
                )}
                {allDone && (
                  <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--success-soft)] py-2 text-[10px] font-bold text-[var(--success)]">
                    <GitPullRequest className="h-3 w-3" /> PR #42 opened — shipped safely
                  </motion.div>
                )}
              </AnimatePresence>

              {stage === 3 && (
                <div className="mt-3 flex justify-center gap-1">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* composer hint */}
        <div className="border-t border-black/5 px-3 py-2.5">
          <div className="rounded-full border border-dashed border-black/10 px-3 py-2 text-[9px] text-[var(--muted-foreground)]">
            Describe the change you want to make…
          </div>
        </div>
      </div>

      {/* Floating chips */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-14 top-16 hidden items-center gap-2 rounded-2xl border border-black/[0.07] bg-white/95 px-3 py-2 shadow-[var(--shadow-md)] backdrop-blur md:flex"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
        <span className="text-[10px] font-bold">Build verified ✓</span>
      </motion.div>
      <motion.div
        animate={{ y: [0, 9, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
        className="absolute -right-12 bottom-24 hidden items-center gap-1.5 rounded-full bg-[var(--term-bg)] px-3 py-2 shadow-lg md:flex"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="font-mono-code text-[9px] text-slate-300">202 accepted</span>
      </motion.div>

      {/* Stage controls */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-2.5 py-2 shadow-[var(--shadow-sm)]">
          {STAGE_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => jumpTo(i)}
              title={label}
              aria-label={`Jump to ${label}`}
              className={`pressable h-2 w-6 rounded-full transition-colors duration-300 ${
                stage === i + 1 || (stage === 6 && i === 5)
                  ? 'bg-gradient-to-r from-[var(--brand)] to-[var(--cyan)]'
                  : 'bg-black/10 hover:bg-black/20'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <p className="font-mono-code text-[10px] text-[var(--muted-foreground)]">
            {stage === 0 ? 'watch the flow →' : `${STAGE_LABELS[Math.min(stage, 6) - 1].toLowerCase()} · tap dots to jump`}
          </p>
          {stage >= 6 && (
            <button onClick={replay} className="pressable rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-bold text-[var(--brand)]">
              ↺ replay
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================ */
/* Landing                                                       */
/* ============================================================ */
const FEATURES = [
  {
    Icon: Zap,
    title: 'Async by default',
    copy: 'Your intent hits a durable Redis queue and returns in under 500ms. Close the app, lose signal, board a flight — the work continues.',
  },
  {
    Icon: Terminal,
    title: 'Deterministic tool-calls',
    copy: 'The agent never free-writes files. It explores, reads and edits through auditable tools — every action streamed live to your screen.',
  },
  {
    Icon: Hammer,
    title: 'Self-healing builds',
    copy: 'Compiler errors are fed straight back for bounded fix attempts. Only builds that pass tsc reach your review queue.',
  },
  {
    Icon: ShieldCheck,
    title: 'You hold the keys',
    copy: 'Nothing ships without your explicit approval. Approve the diff and it lands as a pull request — never a direct push to main.',
  },
]

const STEPS = [
  { n: '01', title: 'Describe the change', copy: '"Fix the null check in checkout.ts" — plain language, any repo you own, typed from anywhere.' },
  { n: '02', title: 'The daemon goes to work', copy: 'It clones, plans, edits via tool-calls and heals its own build errors on an isolated branch.' },
  { n: '03', title: 'Review and ship', copy: 'A clean diff lands on your phone. One tap pushes the branch and opens the pull request.' },
] as const

const PROVIDERS = [
  { Icon: SiOpenrouter, name: 'OpenRouter', desc: '400+ models · free tiers', color: '#6566f1', tint: 'rgba(101,102,241,0.1)' },
  { Icon: SiGooglegemini, name: 'Gemini API', desc: 'Google AI Studio direct', color: '#0a66ff', tint: 'rgba(10,102,255,0.09)' },
  { Icon: TbApi, name: 'Custom endpoint', desc: 'Any OpenAI-compatible URL', color: '#149e53', tint: 'rgba(20,158,83,0.09)' },
]

export function Landing() {
  const { signInWithGitHub } = useGitHubAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-[var(--foreground)] antialiased">
      {/* ---------------- Nav ---------------- */}
      <header
        className={`sticky top-0 z-40 border-b transition-all duration-300 ${
          scrolled ? 'border-black/[0.07] bg-[#fbfbf9]/90 shadow-[0_2px_20px_-8px_rgba(26,30,40,0.12)] backdrop-blur-xl' : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="relative h-8 w-8 overflow-hidden rounded-xl">
              <Image src="/logo.png" alt="WayCode logo" width={32} height={32} className="h-full w-full object-cover" />
            </span>
            <span className="text-gradient-brand text-[17px] font-extrabold tracking-tight">WayCode</span>
          </a>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[var(--foreground-secondary)] md:flex">
            <a href="#demo" className="nav-link transition-colors hover:text-[var(--foreground)]">Demo</a>
            <a href="#features" className="nav-link transition-colors hover:text-[var(--foreground)]">Features</a>
            <a href="#how" className="nav-link transition-colors hover:text-[var(--foreground)]">How it works</a>
            <a href="#providers" className="nav-link transition-colors hover:text-[var(--foreground)]">Providers</a>
          </nav>

          <button
            onClick={signInWithGitHub}
            className="btn-brand pressable flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold"
          >
            <GithubIcon className="h-4 w-4" />
            Sign in
          </button>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section id="top" className="hero-mesh relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-5 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:pb-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/20 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--brand)] shadow-[var(--shadow-sm)]">
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              NOW IN PUBLIC BETA
            </span>

            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.04] tracking-tight sm:text-[56px] lg:text-[64px]">
              Ship code from{' '}
              <span className="text-gradient-animated">anywhere.</span>
            </h1>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--foreground-secondary)] sm:text-base">
              WayCode turns your phone into a remote control for an autonomous engineering agent.
              Describe the fix on your commute — review the finished diff before anything ships.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={signInWithGitHub}
                className="btn-brand pressable flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold"
              >
                <GithubIcon className="h-4 w-4" />
                Start free with GitHub
              </button>
              <a
                href="#demo"
                className="pressable flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-6 py-3.5 text-sm font-semibold text-[var(--foreground-secondary)] backdrop-blur hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                Watch it run
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-6 font-mono-code text-[11px] text-[var(--muted-foreground)]">
              free-tier models included · no credit card · your keys stay yours
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
            id="demo"
          >
            <PhoneDemo />
          </motion.div>
        </div>
      </section>

      {/* ---------------- Log marquee ---------------- */}
      <section aria-label="Live agent activity ticker" className="marquee overflow-hidden border-y border-black/[0.06] bg-[var(--term-bg)] py-3">
        <div className="marquee-track flex w-max gap-8 pr-8">
          {[...Array(2)].map((_, dup) => (
            <div key={dup} className="flex shrink-0 gap-8" aria-hidden={dup === 1}>
              {[
                ['text-slate-500', '$ git clone --depth 1 ✓ 1.2s'],
                ['text-sky-400', 'read_file src/api/checkout.ts'],
                ['text-teal-400', 'edit_file src/api/checkout.ts +12 −3'],
                ['text-emerald-400', 'tsc --noEmit ✓ 0 errors'],
                ['text-amber-400', 'self-heal attempt 1/3 → TS2345 fixed'],
                ['text-slate-500', 'git push origin waycode/task-a91f2c ✓'],
                ['text-cyan-400', 'PR #42 opened → review requested'],
                ['text-slate-500', '202 accepted · task queued in 84ms'],
                ['text-sky-400', 'list_files → 214 files in scope'],
                ['text-emerald-400', 'build verified · ready for review'],
              ].map(([cls, text]) => (
                <span key={`${dup}-${text}`} className={`whitespace-nowrap font-mono-code text-[11px] ${cls}`}>
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-5 py-12 lg:grid-cols-4">
          {[
            { big: <Counter to={500} prefix="<" suffix="ms" />, small: 'acknowledgment, p95' },
            { big: <Counter to={100} suffix="%" />, small: 'continuity on disconnect' },
            { big: <Counter to={3} suffix="×" />, small: 'bounded self-heal attempts' },
            { big: <Counter to={24} suffix="/7" />, small: 'daemon uptime target' },
          ].map((s) => (
            <div key={s.small} className="text-center">
              <p className="text-gradient-brand text-[30px] font-extrabold tracking-tight sm:text-[38px]">{s.big}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{s.small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="scroll-mt-24 bg-gradient-to-b from-white via-[#f4f8ff] to-[#fffdf6] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Built like infrastructure,<br className="hidden sm:block" /> not a chatbot.</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--foreground-secondary)]">
              Every layer is designed around one promise: your work is durable, legible, and always under your control.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <GlowCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">How it works</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Three taps between idea<br className="hidden sm:block" /> and pull request.</h2>

              <div className="relative mt-10 space-y-8 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-gradient-to-b before:from-[var(--brand)] before:via-[var(--cyan)] before:to-transparent">
                {STEPS.map((s) => (
                  <motion.div key={s.n} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, ease }} className="relative flex gap-5 pl-0">
                    <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-[10px] font-extrabold text-white shadow-[0_4px_12px_-3px_var(--brand-glow)]">
                      {s.n.slice(1)}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-bold">{s.title}</h3>
                      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--foreground-secondary)]">{s.copy}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.7, ease }} className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-black/[0.07] shadow-[var(--shadow-lg)] sm:aspect-[4/3.6]">
              <Image src={WORK_IMG} alt="Working from a phone, anywhere" fill sizes="(max-width: 1024px) 100vw, 46vw" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(16,20,28,0.5)] via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/92 p-4 backdrop-blur">
                <p className="font-mono-code text-[10px] font-semibold text-[var(--brand)]">FROM ANYWHERE</p>
                <p className="mt-1 text-[13px] font-bold">Commuting? In a meeting? The daemon already opened the branch.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- Providers / BYOK ---------------- */}
      <section id="providers" className="scroll-mt-24 bg-gradient-to-b from-[#fffdf6] via-white to-[#f4f8ff] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Bring your own key</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Any model. Zero markup.</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--foreground-secondary)]">
                Paste your provider key, run the built-in connection test, save — done. Keys are encrypted at rest
                and decrypted only inside the daemon at call time.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--success)]/25 bg-[var(--success-soft)] px-3.5 py-2 text-[11px] font-semibold text-[var(--success)]">
                <Lock className="h-3.5 w-3.5" />
                AES-256-GCM encrypted · never returned in plaintext
              </p>
            </motion.div>

            <div className="space-y-3">
              {PROVIDERS.map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, x: 22 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease }}
                  className="card-surface flex items-center gap-4 rounded-[22px] p-4 sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: p.tint }}>
                    <p.Icon className="h-6 w-6" style={{ color: p.color }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold">{p.name}</p>
                    <p className="truncate text-[12px] text-[var(--muted-foreground)]">{p.desc}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success)]" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CTA band ---------------- */}
      <section className="px-5 pb-24 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-[var(--chrome-bg)] px-6 py-16 text-center sm:py-20"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_75%_at_50%_120%,rgba(10,102,255,0.4),transparent_70%),radial-gradient(35%_45%_at_85%_-10%,rgba(0,183,232,0.18),transparent_70%)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-[42px] sm:leading-tight">
              Your next fix is one<br className="hidden sm:block" /> message away.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Connect GitHub, bring your own key — free tiers work out of the box — and dispatch your first task in under two minutes.
            </p>
            <button
              onClick={signInWithGitHub}
              className="pressable mx-auto mt-9 flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-[#14161c] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] hover:bg-slate-200"
            >
              <GithubIcon className="h-4 w-4" />
              Start building free
            </button>
            <p className="mt-6 font-mono-code text-[11px] text-slate-500">OpenRouter · Gemini · Custom endpoints — BYOK</p>
          </div>
        </motion.div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-black/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" />
            <span className="text-[13px] font-bold">WayCode</span>
          </div>
          <p className="text-center text-[11px] text-[var(--muted-foreground)]">Async engineering, human-approved. © 2026 WayCode</p>
          <a
            href="https://github.com/Aswinsaipalakonda/WayCode"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            GitHub →
          </a>
        </div>
      </footer>
    </div>
  )
}
