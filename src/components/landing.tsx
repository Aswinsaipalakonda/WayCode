'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Terminal,
  GitPullRequest,
} from 'lucide-react'
import { useGitHubAuth } from '@/lib/auth/github'
import { GithubIcon } from '@/components/icons'
import Navbar from '@/components/shadcn-space/blocks/navbar-01/navbar'

const ease = [0.16, 1, 0.3, 1] as const
const DEVICON = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons'

const HERO_IMG =
  'https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=1400&auto=format&fit=crop'
const HOW_IMG =
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1400&auto=format&fit=crop'
/* const CONNECT_IMG =
  'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?q=80&w=1400&auto=format&fit=crop' */

function DevIcon({ slug, className }: { slug: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${DEVICON}/${slug}/${slug}-original.svg`}
      alt=""
      loading="lazy"
      className={className ?? 'h-7 w-7 object-contain'}
    />
  )
}

/* ============================================================ */
/* Sections                                                      */
/* ============================================================ */

function Hero() {
  const { signInWithGitHub } = useGitHubAuth()

  return (
    <section className="relative overflow-hidden">
      {/* soft cobalt mesh */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(70%_60%_at_18%_0%,rgba(10,102,255,0.14),transparent_62%),radial-gradient(50%_50%_at_95%_20%,rgba(0,183,232,0.10),transparent_60%),radial-gradient(55%_40%_at_50%_110%,rgba(247,199,152,0.12),transparent_65%)]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24 lg:pt-14">
        {/* Copy */}
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          {/* trust badge */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex -space-x-2">
              {['AK', 'JD', 'MR', 'TS'].map((i) => (
                <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-[9px] font-bold text-white shadow-sm">
                  {i}
                </span>
              ))}
            </span>
            <span className="text-xs font-semibold text-zinc-500">2,000+ beta developers</span>
            <span className="flex items-center gap-0.5 text-amber-400">
              {'★★★★★'.split('').map((s, i) => (
                <span key={i} className="text-sm">{s}</span>
              ))}
              <span className="ml-1 text-xs font-bold text-zinc-600">5.0</span>
            </span>
          </div>

          <h1 className="mt-5 max-w-xl text-[36px] font-extrabold leading-[1.06] tracking-tight sm:text-[52px] lg:text-[58px]">
            Ship production code from your pocket.
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-500 sm:text-base">
            WayCode pairs an autonomous engineering agent with human-in-the-loop review.
            Dispatch a fix in plain language from anywhere — review the diff before anything ships.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={signInWithGitHub}
              className="btn-brand pressable inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold"
            >
              Join the WayCode program
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#how"
              className="pressable inline-flex items-center justify-center gap-2 rounded-full border border-black/[0.1] bg-white px-6 py-3.5 text-sm font-semibold text-zinc-600 transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Learn more about us
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* capability chips */}
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-semibold text-zinc-500">
            <span className="inline-flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5 text-[var(--brand)]" /> ACI tool-calls</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" /> Self-healing builds</span>
            <span className="inline-flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5 text-[var(--brand)]" /> PR-only shipping</span>
          </div>
        </motion.div>

        {/* Visual — real photo + floating product chips */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.15, ease }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="relative aspect-[4/4.4] overflow-hidden rounded-[32px] border border-black/[0.07] shadow-[0_50px_100px_-35px_rgba(26,30,40,0.45)] sm:aspect-[4/4]">
            <Image src={HERO_IMG} alt="Dispatching a task from a phone" fill priority sizes="(max-width: 1024px) 90vw, 46vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(16,20,28,0.25)] via-transparent to-transparent" />
          </div>

          {/* floating: repo context card */}
          <motion.div
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-3 top-10 w-44 rounded-2xl border border-black/[0.06] bg-white/90 p-3 shadow-[var(--shadow-lg)] backdrop-blur sm:-left-8"
          >
            <p className="truncate font-mono-code text-[10px] font-semibold text-zinc-700">waycode/task-a91f2c</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">Skillvault-047 · main</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-100">
              <span className="block h-full w-3/4 rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--cyan)]" />
            </div>
          </motion.div>

          {/* floating: build verified */}
          <motion.div
            animate={{ y: [0, 9, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="absolute -right-2 bottom-12 flex items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 px-3.5 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur sm:-right-5"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <p className="text-[11px] font-bold leading-tight">Build verified</p>
              <p className="font-mono-code text-[9px] text-zinc-400">tsc --noEmit · 0 errors</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function LogoStrip() {
  return (
    <section className="border-y border-black/[0.05] bg-white py-10">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        Built entirely on a proven, modern stack
      </p>
      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-9 gap-y-5 px-5 sm:gap-x-12">
        {[
          ['github', 'GitHub'],
          ['typescript', 'TypeScript'],
          ['nextjs', 'Next.js'],
          ['tailwindcss', 'Tailwind CSS'],
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
  )
}

const STEPS = [
  {
    title: 'Connect your repository',
    desc: 'Sign in with GitHub and pick any repo you own — least-privilege OAuth, no admin scopes.',
  },
  {
    title: 'Describe the change',
    desc: 'Type plain language intent — “fix the null check in checkout.ts”. No commands to memorize.',
  },
  {
    title: 'Let the agent do the magic',
    desc: 'The daemon clones, edits via deterministic tool-calls and self-heals compiler errors on an isolated branch.',
  },
  {
    title: 'Review, approve & ship',
    desc: 'A clean unified diff lands on your screen. One tap pushes the branch and opens the pull request.',
  },
]

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-b border-black/[0.05] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">It&apos;s Easy to Get Started</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            From sign-in to shipped pull request in four steps — everything you need at your fingertips.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Steps list */}
          <div className="order-2 space-y-3 lg:order-1">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="group flex gap-4 rounded-2xl border border-transparent p-4 transition-all duration-300 hover:border-black/[0.06] hover:bg-white hover:shadow-[var(--shadow-md)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[13px] font-extrabold text-[var(--brand)] transition-colors group-hover:bg-gradient-to-br group-hover:from-[var(--brand)] group-hover:to-[var(--cyan)] group-hover:text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[15px] font-bold">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease }}
            className="relative order-1 lg:order-2"
          >
            <div aria-hidden className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(10,102,255,0.16),transparent_70%)] blur-xl" />
            <div className="relative aspect-[4/3.2] overflow-hidden rounded-[28px] border border-black/[0.07] shadow-[0_40px_80px_-30px_rgba(26,30,40,0.4)]">
              <Image src={HOW_IMG} alt="The daemon working on a cloned repository" fill sizes="(max-width: 1024px) 92vw, 46vw" className="object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(16,20,28,0.35)] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/20 bg-white/85 px-4 py-2.5 backdrop-blur">
                <span className="font-mono-code text-[10px] text-zinc-600">npx tsc --noEmit</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 0 errors
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const TESTIMONIALS = [
  {
    quote: 'I cleared a week of backlog issues during my commute. The diff review is so tight I trust it more than some human PRs.',
    name: 'Arjun K.',
    role: 'Maintainer · open-source OSS',
    initials: 'AK',
    tint: 'from-[var(--brand)] to-[var(--cyan)]',
  },
  {
    quote: 'Landing-page tweaks used to wait until I got home. Now the branch is pushed before my coffee is done — and nothing hits main without me.',
    name: 'Meera R.',
    role: 'Solo founder · SaaS',
    initials: 'MR',
    tint: 'from-cyan-500 to-blue-500',
  },
  {
    quote: 'Every autonomous change comes with a full tool-call log. It is the most auditable AI workflow I have seen.',
    name: 'Daniel T.',
    role: 'Engineering manager · fintech',
    initials: 'DT',
    tint: 'from-blue-500 to-indigo-500',
  },
]

function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 border-b border-black/[0.05] bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Developers Share Their<br className="hidden sm:block" /> WayCode Success</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Stories from beta developers who transformed their workflows and shipped measurable results.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.09, ease }}
              className="card-surface flex flex-col rounded-[24px] p-6"
            >
              <span className="text-amber-400">★★★★★</span>
              <blockquote className="mt-3 flex-1 text-[13.5px] leading-relaxed text-zinc-600">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-black/[0.05] pt-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.tint} text-[11px] font-bold text-white`}>
                  {t.initials}
                </span>
                <div>
                  <p className="text-[13px] font-bold">{t.name}</p>
                  <p className="text-[11px] text-zinc-400">{t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}

const INTEGRATION_NODES = [
  { slug: 'github', x: '8%', y: '18%', delay: '0s' },
  { slug: 'supabase', x: '16%', y: '68%', delay: '0.4s' },
  { slug: 'typescript', x: '86%', y: '16%', delay: '0.2s' },
  { slug: 'vercel', x: '92%', y: '64%', delay: '0.6s' },
  { slug: 'redis', x: '26%', y: '88%', delay: '0.3s' },
  { slug: 'docker', x: '78%', y: '88%', delay: '0.5s' },
  { slug: 'tailwindcss', x: '2%', y: '44%', delay: '0.1s' },
  { slug: 'nextjs', x: '98%', y: '42%', delay: '0.7s' },
]

function Integrations() {
  return (
    <section id="integrations" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2">
        <div className="mx-auto h-[420px] w-[130%] max-w-none -translate-x-[11.5%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(10,102,255,0.14),rgba(59,130,246,0.06)_55%,transparent_75%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease }} className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Streamline Connections<br className="hidden sm:block" /> and Automation</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            GitHub sync, encrypted BYOK for OpenRouter, Gemini or custom endpoints — wired into one durable pipeline.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.75, delay: 0.1, ease }}
          className="relative mx-auto mt-12 max-w-md sm:max-w-lg"
        >
          {/* connector lines */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            {INTEGRATION_NODES.map((n, i) => (
              <line key={i} x1={parseFloat(n.x)} y1={parseFloat(n.y)} x2="50" y2="50" stroke="#c9d8f2" strokeWidth="0.28" className="flow-line" />
            ))}
          </svg>

          {/* orbiting integration tiles */}
          {INTEGRATION_NODES.map((n, i) => (
            <motion.span
              key={n.slug}
              animate={{ y: [0, n.y.includes('88') || n.y.includes('86') ? 6 : -6, 0] }}
              transition={{ duration: 5 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: parseFloat(n.delay) }}
              style={{ left: n.x, top: n.y }}
              className="glass-strong absolute z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/70 shadow-[0_16px_36px_-14px_rgba(26,30,40,0.35)] sm:h-14 sm:w-14"
              title={n.slug}
            >
              <DevIcon slug={n.slug} className="h-6 w-6 object-contain sm:h-7 sm:w-7" />
            </motion.span>
          ))}

          {/* center visual */}
          <div className="relative mx-auto aspect-[4/4.2] w-[72%] overflow-hidden rounded-[32px] border border-white/70 shadow-[0_50px_100px_-35px_rgba(26,30,40,0.5)]">
            <Image src={HERO_IMG} alt="WayCode running across your stack" fill sizes="(max-width: 768px) 70vw, 380px" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(16,20,28,0.4)] via-transparent to-transparent" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/20 bg-white/85 px-4 py-2.5 backdrop-blur">
              <p className="text-center font-mono-code text-[10px] text-zinc-600">202 Accepted · task queued in 84ms</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function CTA() {
  const { signInWithGitHub } = useGitHubAuth()

  return (
    <section className="border-y border-black/[0.05] bg-white py-20 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] bg-gradient-to-br from-[#eaf1ff] via-white to-[#fff6ea] px-6 py-16 text-center shadow-[var(--shadow-md)] sm:p-16"
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(10,102,255,0.16),transparent)] blur-xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-lg text-3xl font-extrabold tracking-tight sm:text-[40px]">
            Start Your Journey Today
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
            Free-tier models included · bring your own key anytime · your code never ships without you.
          </p>
          <button
            onClick={signInWithGitHub}
            className="btn-brand pressable mx-auto mt-8 flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold"
          >
            <GithubIcon className="h-4 w-4" />
            Sign in with GitHub — it&apos;s free
          </button>
          <p className="mt-5 font-mono-code text-[11px] text-zinc-400">AES-256-GCM key vault · never returned in plaintext</p>
        </div>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-[#14161c] text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="relative h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/15">
                <Image src="/logo.png" alt="" width={32} height={32} className="h-full w-full object-cover" />
              </span>
              <span className="text-[16px] font-extrabold text-white">WayCode</span>
            </div>
            <p className="mt-3 max-w-[230px] text-[12px] leading-relaxed">
              An async gateway between your phone and an autonomous engineering agent.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-semibold">
              <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> All systems operational
            </span>
          </div>

          {[
            { h: 'PRODUCT', links: [['Features', '#features'], ['How it works', '#how'], ['Testimonials', '#testimonials'], ['Integrations', '#integrations']] },
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
  )
}

/* ============================================================ */
export function Landing() {
  return (
    <div className="min-h-screen bg-white text-[var(--foreground)] antialiased">
      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <HowItWorks />
        <Testimonials />
        <Integrations />
        <CTA />
      </main>
      <Footer />
    </div
    >
  )
}
