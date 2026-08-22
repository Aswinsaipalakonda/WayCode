'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import {
  Zap,
  Terminal,
  Hammer,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  GitPullRequest,
} from 'lucide-react'
import { useGitHubAuth } from '@/lib/auth/github'
import { GithubIcon } from '@/components/icons'

const HERO_IMG =
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop'
const WORK_IMG =
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1600&auto=format&fit=crop'

const FEATURES = [
  {
    Icon: Zap,
    title: 'Async by default',
    copy: 'Your intent hits a durable queue and returns in under 500ms. Close the app, lose signal, board a flight — the work continues.',
  },
  {
    Icon: Terminal,
    title: 'Deterministic tool-calls',
    copy: 'The agent never free-writes files. It explores, reads, and edits through auditable tools — every action is logged.',
  },
  {
    Icon: Hammer,
    title: 'Self-healing builds',
    copy: 'Compiler errors are fed straight back to the model for bounded fix attempts. Only clean builds reach your review queue.',
  },
  {
    Icon: ShieldCheck,
    title: 'You hold the keys',
    copy: 'Nothing is pushed without your explicit approval. Review the diff, tap once, and it ships to a pull request — never straight to main.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Describe the change',
    copy: '"Fix the null check in checkout.ts" — plain language, any repo you own, from anywhere.',
  },
  {
    n: '02',
    title: 'The daemon goes to work',
    copy: 'It clones, plans, edits via tool-calls, and heals its own build errors on an isolated branch.',
  },
  {
    n: '03',
    title: 'Review and ship',
    copy: 'A clean diff lands on your phone. Approve it and WayCode pushes the branch and opens the PR.',
  },
] as const

const ease = [0.16, 1, 0.3, 1] as const

export function Landing() {
  const { signInWithGitHub } = useGitHubAuth()

  return (
    <div className="min-h-screen bg-[#fafaf8] text-[var(--foreground)] antialiased">
      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#fafaf8]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="relative h-8 w-8 overflow-hidden rounded-xl">
              <Image src="/logo.png" alt="WayCode logo" width={32} height={32} className="h-full w-full object-cover" />
            </span>
            <span className="text-gradient-brand text-[17px] font-extrabold tracking-tight">WayCode</span>
          </a>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[var(--foreground-secondary)] md:flex">
            <a href="#features" className="transition-colors hover:text-[var(--foreground)]">Features</a>
            <a href="#how" className="transition-colors hover:text-[var(--foreground)]">How it works</a>
            <a href="#pricing-faq" className="transition-colors hover:text-[var(--foreground)]">Pricing</a>
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
      <section id="top" className="relative overflow-hidden">
        {/* soft cobalt ambience */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(10,102,255,0.09),transparent_70%)]" />

        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--foreground-secondary)] shadow-[var(--shadow-sm)]">
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              NOW IN PUBLIC BETA
            </span>

            <h1 className="mt-5 text-[38px] font-extrabold leading-[1.06] tracking-tight sm:text-[52px] lg:text-[60px]">
              Ship code from
              <br />
              <span className="text-gradient-brand">anywhere.</span>
            </h1>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--foreground-secondary)] sm:text-base">
              WayCode turns your phone into a remote control for an autonomous engineering agent.
              Describe the fix on the commute — review the finished diff before anything ships.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={signInWithGitHub}
                className="btn-brand pressable flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold"
              >
                <GithubIcon className="h-4 w-4" />
                Start free with GitHub
              </button>
              <a
                href="#how"
                className="pressable flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-6 py-3.5 text-sm font-semibold text-[var(--foreground-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                See how it works
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-5 font-mono-code text-[11px] text-[var(--muted-foreground)]">
              Free-tier models included · no credit card · your keys stay yours
            </p>
          </motion.div>

          {/* Hero visual — image + floating product chips */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.12, ease }}
            className="relative"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-black/[0.07] shadow-[var(--shadow-lg)]">
              <Image src={HERO_IMG} alt="Code editor mid-review" fill priority sizes="(max-width: 1024px) 100vw, 46vw" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(16,20,28,0.32)] via-transparent to-transparent" />
            </div>

            <motion.div
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-3 top-6 hidden items-center gap-2 rounded-2xl border border-black/[0.07] bg-white/95 px-3.5 py-2.5 shadow-[var(--shadow-md)] backdrop-blur sm:flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--brand-soft)]">
                <GitPullRequest className="h-3.5 w-3.5 text-[var(--brand)]" />
              </span>
              <div>
                <p className="text-[11px] font-bold leading-tight">PR #42 opened</p>
                <p className="font-mono-code text-[9px] text-[var(--muted-foreground)]">waycode/task-a91f2c</p>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              className="absolute -bottom-4 left-6 flex items-center gap-2 rounded-2xl border border-black/[0.07] bg-white/95 px-3.5 py-2.5 shadow-[var(--shadow-md)] backdrop-blur"
            >
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
              <p className="text-[11px] font-bold">Build verified — ready for review</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
              className="absolute -right-2 bottom-10 hidden items-center gap-2 rounded-full bg-[var(--term-bg)] px-3.5 py-2 shadow-[var(--shadow-lg)] sm:flex"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="font-mono-code text-[10px] text-slate-300">202 Accepted · queued</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Stats strip ---------------- */}
      <section className="border-y border-black/[0.06] bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-5 py-10 lg:grid-cols-4">
          {[
            ['<500ms', 'acknowledgment, p95'],
            ['100%', 'continuity on disconnect'],
            ['3×', 'bounded self-heal attempts'],
            ['0', 'compute on your phone'],
          ].map(([big, small]) => (
            <div key={small} className="text-center">
              <p className="text-gradient-brand text-[26px] font-extrabold tracking-tight sm:text-3xl">{big}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="scroll-mt-24 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease }}
            className="max-w-xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Built like infrastructure,<br />not a chatbot.
            </h2>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.08, ease }}
                className="card-surface card-interactive group rounded-[24px] p-6"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] transition-transform duration-300 group-hover:scale-110">
                  <f.Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground-secondary)]">{f.copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">How it works</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Three taps between idea and pull request.</h2>

              <div className="mt-9 space-y-7">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="font-mono-code text-[13px] font-bold text-[var(--brand)]">{s.n}</span>
                    <div className="border-l border-black/[0.07] pl-4">
                      <h3 className="text-[15px] font-bold">{s.title}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--foreground-secondary)]">{s.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease }}
              className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-black/[0.07] shadow-[var(--shadow-lg)] sm:aspect-[4/3.4]"
            >
              <Image src={WORK_IMG} alt="Working from a phone" fill sizes="(max-width: 1024px) 100vw, 46vw" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(16,20,28,0.45)] via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/92 p-4 backdrop-blur">
                <p className="font-mono-code text-[10px] text-[var(--muted-foreground)]">FROM ANYWHERE</p>
                <p className="mt-1 text-[13px] font-bold">Commuting? In a meeting? The daemon already shipped the branch.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- CTA band ---------------- */}
      <section id="pricing-faq" className="scroll-mt-24 px-5 pb-24 pt-20 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[var(--chrome-bg)] px-6 py-14 text-center sm:py-16"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(52%_70%_at_50%_115%,rgba(10,102,255,0.35),transparent_70%)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your next fix is one message away.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              Connect GitHub, bring your own key (free tiers work), and dispatch your first task in under two minutes.
            </p>
            <button
              onClick={signInWithGitHub}
              className="pressable mx-auto mt-8 flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#14161c] hover:bg-slate-200"
            >
              <GithubIcon className="h-4 w-4" />
              Start building free
            </button>
            <p className="mt-5 font-mono-code text-[11px] text-slate-500">OpenRouter · Gemini · Custom endpoints — BYOK</p>
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
          <p className="text-[11px] text-[var(--muted-foreground)]">Async engineering, human-approved. © 2026 WayCode</p>
          <a
            href="https://github.com"
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
