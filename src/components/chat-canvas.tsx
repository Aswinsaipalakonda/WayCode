'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowUp,
  Paperclip,
  GitBranch,
  Loader2,
  FileCode2,
  FileText,
  CircleAlert,
  CheckCircle2,
  X,
  Copy,
  Check,
  Cpu,
  ThumbsDown,
  Sparkles,
  ChevronDown,
} from 'lucide-react'

function formatModelDisplay(modelId: string): string {
  if (!modelId) return 'Gemini 2.0 Flash'
  if (modelId.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash'
  if (modelId.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro'
  if (modelId.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash'
  if (modelId.includes('gemma-4-31b')) return 'Gemma 4 31B'
  if (modelId.includes('gemma-4-26b')) return 'Gemma 4 26B'
  if (modelId.includes('llama-3.3-70b')) return 'Llama 3.3 70B'
  if (modelId.includes('qwen-2.5-coder')) return 'Qwen 2.5 Coder'
  if (modelId.includes('deepseek-r1')) return 'DeepSeek R1'
  if (modelId.includes('north-mini-code')) return 'Cohere North'
  if (modelId.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet'
  if (modelId.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku'
  const name = modelId.split('/').pop()?.replace(':free', '') || modelId
  return name.length > 20 ? name.slice(0, 18) + '…' : name
}
import { TelemetryStreamer } from '@/components/telemetry-streamer'
import { DiffReviewModal } from '@/components/diff-review-modal'
import { useAppChrome } from '@/components/app-chrome'
import { openWhatsAppModal } from '@/components/whatsapp-onboarding-modal'
import { TbBrandWhatsapp } from 'react-icons/tb'

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
  inputTokens?: number | null
  outputTokens?: number | null
  modelUsed?: string | null
}

export interface ConversationRef {
  id: string
  repoId?: string | null
  repoName: string | null
}

interface HydratedTaskRow {
  id: string
  prompt: string
  branch_name: string | null
  status: string
  created_at: string
  input_tokens?: number | null
  output_tokens?: number | null
  model_used?: string | null
}

const MAX_LEN = 2000

/** Optional intent attachments (PRD §7.3). */
interface ContextDraft {
  filePath: string
  issueNumber: string
  errorStack: string
}

const EMPTY_CONTEXT: ContextDraft = { filePath: '', issueNumber: '', errorStack: '' }

function hasContextDraft(d: ContextDraft): boolean {
  return !!(d.filePath.trim() || d.issueNumber.trim() || d.errorStack.trim())
}

function contextFromDraft(d: ContextDraft):
  | { filePath?: string; issueNumber?: number; errorStack?: string }
  | null {
  const filePath = d.filePath.trim()
  const issueNumber = Number.parseInt(d.issueNumber.trim(), 10)
  const errorStack = d.errorStack.trim()
  if (!filePath && !errorStack && !Number.isFinite(issueNumber)) return null
  return {
    ...(filePath ? { filePath } : {}),
    ...(Number.isFinite(issueNumber) ? { issueNumber } : {}),
    ...(errorStack ? { errorStack } : {}),
  }
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/**
 * Home screen — ALWAYS a brand-new chat, like ChatGPT/Gemini on launch.
 * Remounts on "New Task" for a clean slate without effect-driven resets.
 * Persisted history lives at its own /c/<id> URL, reachable from the sidebar.
 */
export function ChatCanvas() {
  const { newTaskNonce } = useAppChrome()
  return <ChatThread key={newTaskNonce} />
}

/** Thread bound to one conversation — rendered at its unique /c/<id> URL. */
export function ConversationChat({ conversation }: { conversation: ConversationRef }) {
  const { newTaskNonce } = useAppChrome()
  return <ChatThread key={`c-${newTaskNonce}`} conversation={conversation} />
}

function ChatThread({ conversation }: { conversation?: ConversationRef }) {
  const { user, selectedRepo, repositories, openRepoPicker, onSelectRepo, openSettings } = useAppChrome()
  const router = useRouter()

  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [hydrating, setHydrating] = useState(Boolean(conversation?.id))
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [contextDraft, setContextDraft] = useState<ContextDraft>(EMPTY_CONTEXT)
  const [hasWhatsApp, setHasWhatsApp] = useState<boolean | null>(null)
  const [activeModel, setActiveModel] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let ignore = false
    fetch('/api/settings/load')
      .then((r) => r.json())
      .then((data) => {
        if (!ignore && data.success && data.model) {
          setActiveModel(data.model)
        }
      })
      .catch(() => {})

    const handleModelUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ model?: string }>
      if (customEvent.detail?.model) {
        setActiveModel(customEvent.detail.model)
      }
    }

    window.addEventListener('waycode:model-updated', handleModelUpdate)
    return () => {
      ignore = true
      window.removeEventListener('waycode:model-updated', handleModelUpdate)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    let cancelled = false
    fetch('/api/settings/whatsapp')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setHasWhatsApp(Boolean(data.whatsappNumber))
        }
      })
      .catch(() => {})

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ whatsappNumber?: string | null }>
      if (customEvent.detail && typeof customEvent.detail.whatsappNumber !== 'undefined') {
        setHasWhatsApp(Boolean(customEvent.detail.whatsappNumber))
      }
    }

    window.addEventListener('waycode:whatsapp-updated', handleUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('waycode:whatsapp-updated', handleUpdate)
    }
  }, [user])

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

  // History hydration should land the user on the LATEST message instantly,
  // like ChatGPT — smooth-scrolling a long restored thread feels like drift.
  // The jump (plus a settle re-anchor) is executed by the scroll effect below;
  // this effect only flags it, keeping its dep array size constant.
  const jumpPendingRef = useRef(false)
  useEffect(() => {
    if (jumpPendingRef.current) {
      jumpPendingRef.current = false
      scrollToBottom(false)
      const settle = window.setTimeout(() => scrollToBottom(false), 400)
      return () => window.clearTimeout(settle)
    }
    scrollToBottom()
  }, [messages.length, isSubmitting, scrollToBottom])

  // Conversation pages restore their persisted thread; the home canvas never
  // does — opening the app always starts fresh, ChatGPT-style.
  const conversationId = conversation?.id
  useEffect(() => {
    if (!conversationId || !user) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch(`/api/tasks?conversationId=${encodeURIComponent(conversationId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data.success || !Array.isArray(data.tasks)) return

        const restored: ThreadMessage[] = []
        for (const t of data.tasks as HydratedTaskRow[]) {
          restored.push({
            id: `h-${t.id}`,
            role: 'user',
            text: t.prompt,
            time: new Date(t.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          })
          restored.push({
            id: `t-${t.id}`,
            role: 'assistant',
            task: {
              taskId: t.id,
              branchName: t.branch_name ?? '',
              inputTokens: t.input_tokens,
              outputTokens: t.output_tokens,
              modelUsed: t.model_used,
            },
          })
        }

        // Merge instead of replace — never clobber messages sent mid-hydration.
        // The scroll effect performs the instant jump + settle re-anchor.
        if (restored.length > 0) jumpPendingRef.current = true
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          return [...restored.filter((m) => !seen.has(m.id)), ...prev]
        })
      } catch {
        /* offline tolerance — the empty canvas is still usable */
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, conversationId])

  // Opening an older thread should aim the composer at that thread's repository.
  const conversationRepoId = conversation?.repoId ?? null
  useEffect(() => {
    if (!conversationRepoId || selectedRepo?.id === conversationRepoId) return
    const repo = repositories.find((r) => r.id === conversationRepoId)
    if (repo) onSelectRepo(repo)
  }, [conversationRepoId, repositories, selectedRepo?.id, onSelectRepo])

  // A rejected diff re-queued with reviewer feedback appears instantly as a
  // new user bubble + agent card — mirroring exactly what hydration renders.
  const handleRetryQueued = useCallback(
    (info: { taskId: string; branchName: string; prompt: string }) => {
      setMessages((prev) => [
        ...prev,
        { id: `u-${info.taskId}`, role: 'user', text: info.prompt, time: nowTime() },
        {
          id: `t-${info.taskId}`,
          role: 'assistant',
          task: { taskId: info.taskId, branchName: info.branchName },
        },
      ])
    },
    [],
  )

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value.slice(0, MAX_LEN))
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
  }

  const handleSubmit = async () => {
    const text = prompt.trim()
    if (isSubmitting || !text || !user) return

    if (hasWhatsApp === false) {
      openWhatsAppModal()
      toast.info('WhatsApp number required', {
        description: 'Connect your WhatsApp number to receive deployment alerts before starting tasks.',
      })
      return
    }

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
    const context = contextFromDraft(contextDraft)
    setShowAttachments(false)

    try {
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          repoId: selectedRepo.id,
          repoName: selectedRepo.repo_name,
          // Continue the open thread, or spin up a fresh conversation for this prompt.
          ...(conversation
            ? { conversationId: conversation.id }
            : { startConversation: true }),
          ...(context ? { context } : {}),
        }),
      })
      const data = await res.json()

      if (res.status === 202 && data.success) {
        setContextDraft(EMPTY_CONTEXT)
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
        // First prompt of a new thread → move to its permanent URL so refresh,
        // history and the sidebar all point at the same conversation.
        if (!conversation && data.conversationId) {
          router.push(`/c/${data.conversationId}`)
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== userMessageId))
        if (res.status === 428 || data.requiresWhatsApp) {
          openWhatsAppModal()
          toast.info('WhatsApp number required', {
            description: 'Connect your WhatsApp number to receive deployment alerts before starting tasks.',
          })
        } else {
          toast.error(data.error || 'Could not queue this task', {
            description: 'Give it another moment and try again.',
          })
        }
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
        {!hasThread && hydrating ? (
          /* Restoring the persisted thread */
          <div className="flex min-h-full items-center justify-center">
            <span className="flex items-center gap-2 text-[12px] font-medium text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--brand)]" />
              Restoring your tasks…
            </span>
          </div>
        ) : !hasThread ? (
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

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex items-center gap-1"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={openRepoPicker}
                className={`pressable flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-4 py-2.5 text-[13px] font-semibold shadow-[var(--shadow-md)] ${
                  selectedRepo
                    ? 'border-[var(--brand)]/30 text-[var(--brand)]'
                    : 'border-black/10 text-[var(--foreground-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
                }`}
              >
                <Image src="/logo.png" alt="" width={15} height={15} />
                {selectedRepo ? selectedRepo.repo_name.split('/')[1] || selectedRepo.repo_name : 'Select repository'}
              </motion.button>
              {selectedRepo && (
                <button
                  onClick={() => {
                    onSelectRepo(null)
                    toast('Repository removed', { description: 'Pick another one whenever you are ready.' })
                  }}
                  aria-label="Remove repository"
                  title="Remove repository"
                  className="pressable rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--error-soft)] hover:text-[var(--error)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </motion.div>
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
                <TaskCard key={message.id} task={message.task} onRetryQueued={handleRetryQueued} />
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
            {/* Repository chip & WhatsApp alert status */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={openRepoPicker}
                  aria-label="Choose repository"
                  className={`pressable inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
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
                {selectedRepo && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRepo(null)
                      toast('Repository removed', { description: 'Tasks need a repository — pick one to continue.' })
                    }}
                    aria-label="Remove repository"
                    title="Remove repository"
                    className="pressable rounded-full p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--error-soft)] hover:text-[var(--error)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {hasWhatsApp === false && (
                <button
                  type="button"
                  onClick={openWhatsAppModal}
                  className="pressable inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 shadow-xs transition-all hover:bg-amber-500/20 active:scale-95"
                >
                  <TbBrandWhatsapp className="h-3.5 w-3.5 text-[#128C7E]" />
                  <span>WhatsApp Required to Run Tasks</span>
                </button>
              )}
            </div>

            {/* Context attachments panel (PRD §7.3) */}
            <AnimatePresence initial={false}>
              {showAttachments && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mb-2 space-y-2 rounded-2xl border border-black/[0.06] bg-white/85 p-2.5">
                    <div className="flex items-center justify-between px-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        Context for the agent
                      </p>
                      {hasContextDraft(contextDraft) && (
                        <button
                          type="button"
                          onClick={() => setContextDraft(EMPTY_CONTEXT)}
                          className="pressable text-[10px] font-bold text-[var(--error)] hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block px-0.5 text-[10px] font-semibold text-[var(--foreground-secondary)]">
                          File path
                        </span>
                        <input
                          type="text"
                          value={contextDraft.filePath}
                          onChange={(e) =>
                            setContextDraft((d) => ({ ...d, filePath: e.target.value.slice(0, 512) }))
                          }
                          placeholder="src/app/api/checkout.ts"
                          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 font-mono-code text-[11px] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block px-0.5 text-[10px] font-semibold text-[var(--foreground-secondary)]">
                          GitHub issue #
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={contextDraft.issueNumber}
                          onChange={(e) =>
                            setContextDraft((d) => ({ ...d, issueNumber: e.target.value.slice(0, 9) }))
                          }
                          placeholder="42"
                          className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 font-mono-code text-[11px] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)]"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block px-0.5 text-[10px] font-semibold text-[var(--foreground-secondary)]">
                        Error stack / output
                      </span>
                      <textarea
                        value={contextDraft.errorStack}
                        onChange={(e) =>
                          setContextDraft((d) => ({ ...d, errorStack: e.target.value.slice(0, 4000) }))
                        }
                        rows={3}
                        maxLength={4000}
                        placeholder="Paste the stack trace or failing output…"
                        className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 font-mono-code text-[11px] leading-relaxed outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)]"
                      />
                    </label>
                    <p className="px-0.5 text-right text-[9px] font-medium text-[var(--muted-foreground)]">
                      Folded into the agent&apos;s brief · {contextDraft.errorStack.length}/4000
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                onClick={() => setShowAttachments((v) => !v)}
                aria-expanded={showAttachments}
                aria-label="Attach context"
                title="Attach context (file, issue, stack trace)"
                className={`pressable rounded-full p-2 ${
                  hasContextDraft(contextDraft)
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]'
                }`}
              >
                <Paperclip className="h-[18px] w-[18px]" />
              </button>

              <div className="flex items-center gap-2">
                {/* Active Model Selector Pill — displays chosen model & opens settings on tap */}
                <button
                  type="button"
                  onClick={openSettings}
                  title="Change AI model in settings"
                  className="group flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground-secondary)] shadow-xs transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--brand)] transition-transform duration-300 group-hover:scale-110" />
                  <span className="max-w-[120px] truncate font-mono-code text-[11px] font-medium sm:max-w-[190px]">
                    {formatModelDisplay(activeModel)}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50 transition-transform duration-200 group-hover:translate-y-0.5" />
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

const PIPELINE_STEPS = [
  { key: 'queued', label: 'Queued', hint: 'Task accepted and waiting for a worker' },
  { key: 'generating', label: 'Generating', hint: 'AI is writing the changes on your branch' },
  { key: 'verifying', label: 'Verifying', hint: 'Compile & syntax checks are running' },
  { key: 'review', label: 'Review', hint: 'Diff is ready — nothing ships until you approve' },
] as const

function TaskCard({
  task,
  onRetryQueued,
}: {
  task: QueuedTask
  onRetryQueued?: (info: { taskId: string; branchName: string; prompt: string }) => void
}) {
  const supabase = createClient()
  const [status, setStatus] = useState<string>('queued')
  const [diffContent, setDiffContent] = useState<string | null>(null)
  const [usage, setUsage] = useState<{
    input: number | null
    output: number | null
    model: string | null
  }>({ input: task.inputTokens ?? null, output: task.outputTokens ?? null, model: task.modelUsed ?? null })
  const [reviewOpen, setReviewOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Catch up on current state, then follow live updates with polling fallback.
  useEffect(() => {
    let cancelled = false

    async function catchUp() {
      const { data } = await supabase
        .from('task_jobs')
        .select('status, diff_content, input_tokens, output_tokens, model_used')
        .eq('id', task.taskId)
        .single()
      if (!cancelled && data) {
        if (data.status) setStatus(data.status)
        if (data.diff_content) setDiffContent(data.diff_content as string)
        setUsage({
          input: (data.input_tokens as number | null) ?? null,
          output: (data.output_tokens as number | null) ?? null,
          model: (data.model_used as string | null) ?? null,
        })
      }
    }
    catchUp()

    // Active polling interval while task is running or verifying
    const pollInterval = setInterval(() => {
      if (!cancelled) catchUp()
    }, 2500)

    const channel = supabase
      .channel(`task_jobs_${task.taskId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'task_jobs', filter: `id=eq.${task.taskId}` },
        (payload) => {
          const next = payload.new as {
            status?: string
            diff_content?: string | null
            input_tokens?: number | null
            output_tokens?: number | null
            model_used?: string | null
          }
          if (next.status) setStatus(next.status)
          if (next.diff_content) setDiffContent(next.diff_content)
          setUsage({
            input: next.input_tokens ?? null,
            output: next.output_tokens ?? null,
            model: next.model_used ?? null,
          })
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [supabase, task.taskId])

  const statusLower = status?.toLowerCase()
  const meta = STATUS_META[statusLower] ?? {
    label: status || 'Queued',
    cls: 'bg-[rgba(120,128,140,0.14)] text-[#585e68]',
  }
  const reviewable =
    !!diffContent && ['verifying', 'build_verified', 'completed', 'success'].includes(statusLower)
  const failed = statusLower === 'failed'
  const taskActive = !['completed', 'success', 'failed', 'rejected'].includes(statusLower)
  const subtitle =
    statusLower === 'failed'
      ? 'Needs manual attention'
      : statusLower === 'rejected'
        ? 'Changes discarded'
        : ['completed', 'success'].includes(statusLower)
          ? 'Shipped — PR created & pushed to GitHub'
          : statusLower === 'verifying'
            ? 'Build verified — ready to review'
            : statusLower === 'processing'
              ? 'Generating changes…'
              : 'Queued for the build daemon…'

  // Map raw status → pipeline stage index.
  const stepIndex = ['completed', 'success'].includes(statusLower)
    ? 3
    : ['verifying', 'build_verified'].includes(statusLower)
      ? 2
      : statusLower === 'processing'
        ? 1
        : 0

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      window.setTimeout(() => {
        setCopiedField((cur) => (cur === key ? null : cur))
      }, 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

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
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative shrink-0">
              {taskActive && (
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--brand)] opacity-20" aria-hidden />
              )}
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-black shadow-[var(--shadow-sm)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-white.svg" alt="WayCode" className="h-5 w-5 object-contain" />
              </span>
            </span>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[var(--foreground)]">WayCode Agent</h3>
              <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    failed
                      ? 'bg-[var(--error)]'
                      : ['completed', 'success'].includes(statusLower)
                        ? 'bg-[var(--success)]'
                        : 'bg-[var(--brand)]'
                  }`}
                />
                {subtitle}
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}>
            {meta.pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
            {meta.label}
          </span>
        </div>

        {/* Pipeline */}
        <Pipeline current={stepIndex} failed={failed} rejected={statusLower === 'rejected'} />

        {/* Task branch and commit tags */}
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-black/[0.06] bg-black/[0.03] px-2 py-0.5 font-mono-code text-[11px] text-[var(--muted-foreground)]">
            <FileText className="h-3 w-3" />
            waycode/{task.taskId.slice(0, 8)}
            <button
              type="button"
              onClick={() => void copyText('taskId', task.taskId)}
              className="ml-0.5 opacity-60 hover:opacity-100"
              title="Copy task ID"
            >
              {copiedField === 'taskId' ? <Check className="h-2.5 w-2.5 text-[var(--success)]" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          </span>

          <span className="inline-flex items-center gap-1 rounded-md border border-black/[0.06] bg-black/[0.03] px-2 py-0.5 font-mono-code text-[11px] text-[var(--muted-foreground)]">
            <GitBranch className="h-3 w-3" />
            {task.branchName}
            <button
              type="button"
              onClick={() => void copyText('branch', task.branchName)}
              className="ml-0.5 opacity-60 hover:opacity-100"
              title="Copy branch name"
            >
              {copiedField === 'branch' ? <Check className="h-2.5 w-2.5 text-[var(--success)]" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          </span>
        </div>

        {/* Agent Activity Terminal */}
        <div className="mx-4 mb-3">
          <TelemetryStreamer taskId={task.taskId} active={taskActive} />
        </div>

        {/* Tokens and Model info */}
        {usage.input != null && usage.output != null && usage.input + usage.output > 0 && (
          <p className="flex items-center justify-center gap-1.5 pb-2.5 text-[10px] font-medium text-[var(--muted-foreground)]">
            <Cpu className="h-3 w-3 shrink-0" />
            {(usage.input + usage.output).toLocaleString()} tokens used
            {usage.model ? <span className="font-mono-code">· {usage.model}</span> : null}
          </p>
        )}

        {/* Review CTA / decision / failure note */}
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
                  ['completed', 'success', 'rejected'].includes(statusLower) ? (
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setReviewOpen(true)}
                        className="pressable flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 text-xs font-bold text-[var(--foreground)] hover:border-[var(--brand)]"
                      >
                        <FileCode2 className="h-3.5 w-3.5" />
                        Review changes
                      </button>
                      {statusLower === 'rejected' ? (
                        <span className="flex flex-[1.2] items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 text-xs font-bold text-[var(--foreground-secondary)]">
                          <ThumbsDown className="h-3.5 w-3.5" />
                          Rejected
                        </span>
                      ) : (
                        <span className="flex flex-[1.2] items-center justify-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success-soft)] py-2.5 text-xs font-bold text-[var(--success)]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pushed to GitHub
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewOpen(true)}
                      className="btn-brand pressable flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold"
                    >
                      <FileCode2 className="h-3.5 w-3.5" />
                      Review changes
                    </button>
                  )
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
        onApproved={() => {
          setStatus('completed')
        }}
        onRejected={() => {
          setStatus('rejected')
        }}
        onRetryQueued={(info) => {
          setReviewOpen(false)
          onRetryQueued?.(info)
        }}
        decision={
          statusLower === 'rejected'
            ? 'rejected'
            : ['completed', 'success'].includes(statusLower)
              ? 'pushed'
              : null
        }
      />
    </>
  )
}

function Pipeline({
  current,
  failed,
  rejected,
}: {
  current: number
  failed: boolean
  rejected: boolean
}) {
  const pct = (current / (PIPELINE_STEPS.length - 1)) * 100

  return (
    <div className="mx-4 mb-3 mt-1">
      <div className="relative flex items-start justify-between">
        {/* Track */}
        <div className="absolute left-[12.5%] right-[12.5%] top-[7px] h-[2px] rounded-full bg-black/[0.07]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${failed || rejected ? Math.max(pct - 33, 0) : pct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-full ${
              failed ? 'bg-[var(--error)]' : 'bg-gradient-to-r from-[var(--brand)] to-[var(--cyan)]'
            }`}
          />
        </div>

        {PIPELINE_STEPS.map((step, i) => {
          const done = i < current && !(failed || rejected)
          const isCurrent = i === current
          const isError = isCurrent && failed
          const isRejected = isCurrent && rejected

          return (
            <div key={step.key} className="relative z-10 flex w-1/4 flex-col items-center gap-1" title={step.hint}>
              <span
                className={`flex h-[14px] w-[14px] items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                  isError
                    ? 'border-[var(--error)] bg-[var(--error)]'
                    : isRejected
                      ? 'border-[var(--muted-foreground)] bg-[var(--background)]'
                      : done
                        ? 'border-transparent bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)]'
                        : isCurrent
                          ? 'border-[var(--brand)] bg-white'
                          : 'border-black/10 bg-white'
                }`}
              >
                {done && <Check className="h-[8px] w-[8px] text-white" strokeWidth={3.5} />}
                {isError && <X className="h-[8px] w-[8px] text-white" strokeWidth={3.5} />}
                {isCurrent && !isError && !isRejected && (
                  <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[var(--brand)]" />
                )}
              </span>
              <span
                className={`text-[9px] font-bold leading-none ${
                  isError
                    ? 'text-[var(--error)]'
                    : isRejected
                      ? 'text-[var(--muted-foreground)]'
                      : done
                        ? 'text-[var(--foreground-secondary)]'
                        : isCurrent
                          ? 'text-[var(--foreground)]'
                          : 'text-[var(--muted-foreground)] opacity-70'
                }`}
              >
                {isError ? 'Failed' : step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
