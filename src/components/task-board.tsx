'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import {
  ListChecks,
  Clock3,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
  Inbox,
} from 'lucide-react'

interface TaskJob {
  id: string
  prompt: string
  status: string
  branch_name: string | null
  created_at: string
  repo_id?: string | null
}

type StatusFilter = 'all' | 'active' | 'completed' | 'failed'

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  queued: {
    label: 'Queued',
    cls: 'bg-[rgba(120,128,140,0.14)] text-[#585e68]',
    dot: 'bg-[#78808d]',
  },
  processing: {
    label: 'Working',
    cls: 'bg-[var(--brand-soft)] text-[var(--brand)]',
    dot: 'bg-[var(--brand)]',
  },
  verifying: {
    label: 'Ready to review',
    cls: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    dot: 'bg-[var(--warning)]',
  },
  build_verified: {
    label: 'Ready to review',
    cls: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    dot: 'bg-[var(--warning)]',
  },
  completed: {
    label: 'Completed',
    cls: 'bg-[var(--success-soft)] text-[var(--success)]',
    dot: 'bg-[var(--success)]',
  },
  success: {
    label: 'Completed',
    cls: 'bg-[var(--success-soft)] text-[var(--success)]',
    dot: 'bg-[var(--success)]',
  },
  failed: {
    label: 'Failed',
    cls: 'bg-[var(--error-soft)] text-[var(--error)]',
    dot: 'bg-[var(--error)]',
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-[rgba(120,128,140,0.14)] text-[#585e68]',
    dot: 'bg-[#78808d]',
  },
}

function statusMeta(status: string) {
  return (
    STATUS_META[status?.toLowerCase()] ?? {
      label: status || 'Unknown',
      cls: 'bg-[rgba(120,128,140,0.14)] text-[#585e68]',
      dot: 'bg-[#78808d]',
    }
  )
}

export function TaskBoard({ tasks }: { tasks: TaskJob[] }) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')

  const stats = useMemo(() => {
    const active = tasks.filter((t) => ['queued', 'processing', 'verifying', 'build_verified'].includes(t.status?.toLowerCase()))
    const completed = tasks.filter((t) => ['completed', 'success'].includes(t.status?.toLowerCase()))
    const failed = tasks.filter((t) => t.status?.toLowerCase() === 'failed')
    return { total: tasks.length, active: active.length, completed: completed.length, failed: failed.length }
  }, [tasks])

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const s = t.status?.toLowerCase()
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && ['queued', 'processing', 'verifying', 'build_verified'].includes(s)) ||
        (filter === 'completed' && ['completed', 'success'].includes(s)) ||
        (filter === 'failed' && s === 'failed')
      const matchesQuery =
        !query.trim() ||
        t.prompt?.toLowerCase().includes(query.toLowerCase()) ||
        t.branch_name?.toLowerCase().includes(query.toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [tasks, filter, query])

  const kpis = [
    { label: 'Total', value: stats.total, icon: ListChecks, tone: 'text-[var(--brand)] bg-[var(--brand-soft)]' },
    { label: 'Active', value: stats.active, icon: Clock3, tone: 'text-[var(--warning)] bg-[var(--warning-soft)]' },
    { label: 'Shipped', value: stats.completed, icon: CheckCircle2, tone: 'text-[var(--success)] bg-[var(--success-soft)]' },
    { label: 'Failed', value: stats.failed, icon: XCircle, tone: 'text-[var(--error)] bg-[var(--error-soft)]' },
  ]

  const filters: Array<{ id: StatusFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Done' },
    { id: 'failed', label: 'Failed' },
  ]

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="anim-fade-up pt-1">
        <h1 className="text-[26px] font-bold tracking-tight sm:text-3xl">
          Your <span className="text-gradient-brand">jobs</span>
        </h1>
        <p className="mt-1 text-[13px] text-[var(--foreground-secondary)] sm:text-sm">
          Every dispatch, its execution trail and final outcome.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className="rounded-[24px] border border-black/[0.05] bg-white/90 p-4 shadow-[var(--shadow-md)] backdrop-blur"
            >
              <span className={`mb-3 inline-flex rounded-xl p-2 ${kpi.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="font-mono-code text-[22px] font-bold leading-none">{kpi.value}</p>
              <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                {kpi.label}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
        className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts or branches…"
            aria-label="Search jobs"
            className="w-full rounded-full border border-black/[0.07] bg-white/90 py-3 pl-11 pr-4 text-[13px] shadow-[var(--shadow-sm)] outline-none backdrop-blur transition-all placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)] focus:shadow-[0_0_0_4px_var(--brand-soft)]"
          />
        </div>

        <div className="flex items-center gap-0.5 self-start rounded-full border border-black/[0.06] bg-white/90 p-1 shadow-[var(--shadow-sm)] sm:self-auto">
          {filters.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`pressable relative rounded-full px-3.5 py-2 text-[12px] font-semibold ${
                  active ? '' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="task-filter-pill"
                    transition={{ type: 'spring', stiffness: 430, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-[#17191f]"
                  />
                )}
                <span className={`relative ${active ? 'text-white' : ''}`}>{f.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Task list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-black/10 bg-white/60 px-6 py-16 text-center backdrop-blur"
            >
              <span className="anim-float flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
                <Inbox className="h-5 w-5 text-[var(--brand)]" />
              </span>
              <h3 className="text-sm font-bold">No jobs here yet</h3>
              <p className="max-w-xs text-xs leading-relaxed text-[var(--muted-foreground)]">
                {tasks.length === 0
                  ? 'Dispatch your first task — describe the change and WayCode handles the rest.'
                  : 'No jobs match this filter or search.'}
              </p>
              {tasks.length === 0 && (
                <Link href="/" className="btn-brand pressable mt-1 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold">
                  Compose a task <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </motion.div>
          ) : (
            filtered.map((task, i) => {
              const meta = statusMeta(task.status)
              return (
                <motion.article
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="group flex items-center justify-between gap-3 rounded-[22px] border border-black/[0.05] bg-white/90 p-4 shadow-[var(--shadow-sm)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-black/[0.09] hover:shadow-[var(--shadow-md)]"
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-[13px] font-semibold">{task.prompt}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-[var(--muted-foreground)]">
                      <code className="truncate font-mono-code">{task.branch_name || 'waycode/task-init'}</code>
                      <span>·</span>
                      <time dateTime={task.created_at}>
                        {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                        {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide ${meta.cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                </motion.article>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
