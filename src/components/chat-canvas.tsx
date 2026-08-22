'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowUp,
  Paperclip,
  GitBranch,
  Loader2,
  FileCode2,
  CircleAlert,
  CheckCircle2,
} from 'lucide-react'
import { TelemetryStreamer } from '@/components/telemetry-streamer'
import { DiffReviewModal } from '@/components/diff-review-modal'
import { useAppChrome } from '@/components/app-chrome'

interface ThreadMessage {
  id: string
  role: 'user' | 'assistant'
  text?: string
  time?: string
  task?: QueuedTask
}

interface QueuedTask {
  taskId: string
  branchName: string
}

const MAX_LEN = 2000

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * Remounts the whole thread when "New Task" is triggered,
 * giving a clean slate without effect-driven resets.
 */
export function ChatCanvas() {
  const { newTaskNonce } = useAppChrome()
  return <ChatThread key={newTaskNonce} />
}

function ChatThread() {
  const { user, selectedRepo, openRepoPicker } = useAppChrome()

  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    })
  }, [])

  useEffect(() => {
    scrollToBottom(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, isSubmitting, scrollToBottom])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value.slice(0, MAX_LEN))
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
  }

  const handleSubmit = async () => {
    const text = prompt.trim()
    if (isSubmitting || !text || !user) return

    if (!selectedRepo) {
      toast('Pick a repository first', { description: 'Choose where this task should run.' })
      openRepoPicker()
      return
    }

    const userMessageId = `u-${Date.now()}`
    setMessages((prev) => [...prev, { id: userMessageId, role: 'user', text, time: nowTime() }])
    setPrompt('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          repoId: selectedRepo.id,
          repoName: selectedRepo.repo_name,
        }),
      })
      const data = await res.json()

      if (res.status === 202 && data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `t-${data.taskId}`,
            role: 'assistant',
            task: { taskId: data.taskId, branchName: data.branchName },
          },
        ])
        toast.success('Task queued', {
          description: `${selectedRepo.repo_name.split('/')[1] || selectedRepo.repo_name} · ${data.branchName}`,
        })
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== userMessageId))
        toast.error(data.error || 'Could not queue this task', {
          description: 'Give it another moment and try again.',
        })
        setPrompt(text)
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== userMessageId))
      toast.error('Network error', { description: 'Check your connection and try again.' })
      setPrompt(text)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    // On touch devices Enter inserts a newline; desktop submits.
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return
    e.preventDefault()
    handleSubmit()
  }

  /* ---------- Signed out ---------- */
  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 pb-24 text-center">
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="anim-float mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] shadow-[0_12px_32px_-10px_var(--brand-glow)]"
        >
          <Image src="/logo.png" alt="" width={26} height={26} />
        </motion.span>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to WayCode</h1>
        <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[var(--foreground-secondary)]">
          Sign in with GitHub to pick a repository and start shipping changes from anywhere.
        </p>
      </div>
    )
  }

  const hasThread = messages.length > 0 || isSubmitting

  return (
    <div className="flex h-full flex-col">
      {/* ---------- Thread ---------- */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {!hasThread ? (
          /* Empty state — calm, Gemini-style centered */
          <div className="flex min-h-full flex-col items-center justify-center px-6 pb-16 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[27px] sm:text-4xl font-bold tracking-tight"
            >
              What should we{' '}
              <span className="text-gradient-brand">work on</span>?
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 max-w-sm text-[13px] sm:text-sm leading-relaxed text-[var(--foreground-secondary)]"
            >
              Choose a repository, describe the change you want, and review it before anything ships.
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={openRepoPicker}
              className={`pressable mt-8 flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-4 py-2.5 text-[13px] font-semibold shadow-[var(--shadow-md)] ${
                selectedRepo
                  ? 'border-[var(--brand)]/30 text-[var(--brand)]'
                  : 'border-black/10 text-[var(--foreground-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
              }`}
            >
              <Image src="/logo.png" alt="" width={15} height={15} />
              {selectedRepo ? selectedRepo.repo_name.split('/')[1] || selectedRepo.repo_name : 'Select repository'}
            </motion.button>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4 sm:px-6">
            {messages.map((message) =>
              message.role === 'user' ? (
                /* User message — white bubble + avatar right + timestamp (Gemini format) */
                <motion.div
                  key={message.id}
                  layout="position"
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start justify-end gap-2.5"
                >
                  <div className="flex max-w-[82%] flex-col items-end">
                    <div className="whitespace-pre-wrap break-words rounded-[22px] rounded-br-lg border border-black/[0.05] bg-white px-4 py-3 text-[14px] leading-relaxed shadow-[var(--shadow-sm)]">
                      {message.text}
                    </div>
                    <span className="mt-1 mr-1 text-[10px] font-medium text-[var(--muted-foreground)]">
                      {message.time}
                    </span>
                  </div>

                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt=""
                      width={28}
                      height={28}
                      className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-black/10"
                    />
                  ) : (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full btn-brand text-[11px] font-bold">
                      {user.email?.[0]?.toUpperCase() ?? 'U'}
                    </span>
                  )}
                </motion.div>
              ) : message.task ? (
                <TaskCard key={message.id} task={message.task} />
              ) : null
            )}

            {/* Typing indicator while dispatching */}
            <AnimatePresence>
              {isSubmitting && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex"
                >
                  <div className="rounded-[22px] rounded-tl-lg border border-black/[0.05] bg-white px-5 py-4 shadow-[var(--shadow-sm)]">
                    <span className="flex items-center gap-1.5">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-2" />
          </div>
        )}
      </div>

      {/* ---------- Composer ---------- */}
      <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+92px)] pt-2 sm:px-6 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-2xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="rounded-[28px] border border-white/70 bg-white/75 p-3 shadow-[var(--shadow-composer)] backdrop-blur-xl transition-shadow duration-300 focus-within:border-white focus-within:shadow-[0_18px_54px_-18px_rgba(10,102,255,0.35),0_2px_10px_-3px_rgba(26,30,40,0.08)]"
          >
            {/* Repository chip */}
            <button
              type="button"
              onClick={openRepoPicker}
              aria-label="Choose repository"
              className={`pressable mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                selectedRepo
                  ? 'border-transparent bg-[var(--brand-soft)] text-[var(--brand)]'
                  : 'border-dashed border-black/15 text-[var(--muted-foreground)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
              }`}
            >
              <Image src="/logo.png" alt="" width={13} height={13} />
              <span className="truncate">
                {selectedRepo
                  ? selectedRepo.repo_name.split('/')[1] || selectedRepo.repo_name
                  : 'Select repository'}
              </span>
              {selectedRepo && (
                <span className="hidden items-center gap-1 font-mono-code text-[9.5px] font-medium normal-case text-[var(--muted-foreground)] xs:inline-flex">
                  <GitBranch className="h-2.5 w-2.5" />
                  {selectedRepo.default_branch || 'main'}
                </span>
              )}
            </button>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                selectedRepo
                  ? 'Describe the change you want to make…'
                  : 'Select a repository to get started…'
              }
              className="w-full resize-none border-0 bg-transparent px-1 text-[14px] leading-relaxed outline-none placeholder:text-[var(--muted-foreground)]"
            />

            <div className="mt-2 flex items-center justify-between pl-0.5 pr-0.5">
              <button
                type="button"
                onClick={() => toast('Attachments', { description: 'Context files are coming soon.' })}
                aria-label="Attach file"
                title="Attach file"
                className="pressable rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </button>

              <button
                type="submit"
                disabled={!prompt.trim()}
                aria-label="Send"
                className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_4px_16px_-4px_var(--brand-glow)] transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

/* ============================================================ */

const STATUS_META: Record<string, { label: string; cls: string; pulse?: boolean }> = {
  queued: { label: 'Queued', cls: 'bg-[rgba(120,128,140,0.14)] text-[#585e68]' },
  processing: { label: 'Working', cls: 'bg-[var(--brand-soft)] text-[var(--brand)]', pulse: true },
  verifying: { label: 'Ready to review', cls: 'bg-[var(--warning-soft)] text-[var(--warning)]' },
  build_verified: { label: 'Ready to review', cls: 'bg-[var(--warning-soft)] text-[var(--warning)]' },
  completed: { label: 'Completed', cls: 'bg-[var(--success-soft)] text-[var(--success)]' },
  success: { label: 'Completed', cls: 'bg-[var(--success-soft)] text-[var(--success)]' },
  failed: { label: 'Failed', cls: 'bg-[var(--error-soft)] text-[var(--error)]' },
  rejected: { label: 'Rejected', cls: 'bg-[rgba(120,128,140,0.14)] text-[#585e68]' },
}

function TaskCard({ task }: { task: QueuedTask }) {
  const supabase = createClient()
  const [status, setStatus] = useState<string>('queued')
  const [diffContent, setDiffContent] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  // Catch up on current state, then follow live updates.
  useEffect(() => {
    let cancelled = false

    async function catchUp() {
      const { data } = await supabase
        .from('task_jobs')
        .select('status, diff_content')
        .eq('id', task.taskId)
        .single()
      if (!cancelled && data) {
        setStatus(data.status ?? 'queued')
        if (data.diff_content) setDiffContent(data.diff_content as string)
      }
    }
    catchUp()

    const channel = supabase
      .channel(`task_jobs_${task.taskId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'task_jobs', filter: `id=eq.${task.taskId}` },
        (payload) => {
          const next = payload.new as { status?: string; diff_content?: string | null }
          if (next.status) setStatus(next.status)
          if (next.diff_content) setDiffContent(next.diff_content)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [supabase, task.taskId])

  const meta = STATUS_META[status?.toLowerCase()] ?? {
    label: status || 'Queued',
    cls: 'bg-[rgba(120,128,140,0.14)] text-[#585e68]',
  }
  const statusLower = status?.toLowerCase()
  const reviewable =
    !!diffContent && ['verifying', 'build_verified', 'completed', 'success'].includes(statusLower)
  const failed = statusLower === 'failed'

  return (
    <>
      <motion.article
        layout="position"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-[24px] border border-black/[0.05] bg-white/90 shadow-[var(--shadow-md)] backdrop-blur"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] p-[1.5px]">
              <span className="flex h-full w-full items-center justify-center rounded-[7px] bg-white">
                <Image src="/logo.png" alt="" width={14} height={14} className="object-contain" />
              </span>
            </span>
            <p className="truncate text-[13px] font-semibold">WayCode</p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${meta.cls}`}
          >
            {meta.pulse && <span className="live-dot" style={{ width: 6, height: 6 }} />}
            {meta.label.toUpperCase()}
          </span>
        </div>

        {/* Branch line */}
        <div className="flex items-center gap-1.5 px-4 pb-2 text-[11px] text-[var(--muted-foreground)]">
          <GitBranch className="h-3 w-3 shrink-0" />
          <code className="truncate font-mono-code">{task.branchName}</code>
        </div>

        {/* Live activity */}
        <div className="mx-4 mb-2">
          <TelemetryStreamer taskId={task.taskId} />
        </div>

        {/* Review CTA / failure note */}
        <AnimatePresence>
          {(reviewable || failed) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-black/[0.05] p-3">
                {reviewable ? (
                  <button
                    onClick={() => setReviewOpen(true)}
                    className="btn-brand pressable flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold"
                  >
                    <FileCode2 className="h-3.5 w-3.5" />
                    Review changes
                  </button>
                ) : (
                  <p className="flex items-center justify-center gap-1.5 py-1 text-center text-[11px] font-medium text-[var(--error)]">
                    <CircleAlert className="h-3.5 w-3.5" />
                    This one needs manual attention — nothing was pushed.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {statusLower === 'completed' && !reviewable && (
          <p className="flex items-center justify-center gap-1.5 border-t border-black/[0.05] py-2.5 text-[11px] font-semibold text-[var(--success)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Shipped successfully
          </p>
        )}
      </motion.article>

      <DiffReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        taskId={task.taskId}
        branchName={task.branchName}
        diffContent={diffContent ?? ''}
      />
    </>
  )
}
