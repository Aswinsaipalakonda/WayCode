'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { FileCode2, GitPullRequest, GitBranch, X, Loader2, ThumbsDown, CheckCircle2, Plus, Minus } from 'lucide-react'

interface DiffReviewModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  branchName: string
  diffContent: string
  /** Set once the user has decided — the modal becomes read-only history. */
  decision?: 'pushed' | 'rejected' | null
}

export function DiffReviewModal({ isOpen, onClose, taskId, branchName, diffContent, decision = null }: DiffReviewModalProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)

  const lines = diffContent ? diffContent.split('\n') : []
  const additions = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length
  const deletions = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const res = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setResult('approved')
        toast.success('Approved & pushed', {
          description: `Branch ${branchName || 'working branch'} pushed · PR opened on GitHub.`,
        })
        setTimeout(onClose, 1800)
      } else {
        toast.error('Approval failed', { description: data.error || 'The daemon could not push this change.' })
      }
    } catch {
      toast.error('Network error', { description: 'Could not reach the approval endpoint.' })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      const res = await fetch('/api/tasks/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      if (res.ok) {
        setResult('rejected')
        toast.info('Task rejected', { description: 'The working branch was discarded. Nothing was pushed.' })
        setTimeout(onClose, 1400)
      } else {
        toast.error('Rejection failed', { description: 'Could not discard this task.' })
      }
    } catch {
      toast.error('Network error', { description: 'Could not reach the rejection endpoint.' })
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
          <motion.button
            aria-label="Close review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Diff review"
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] sm:h-[min(85vh,780px)] sm:rounded-[24px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_2px_12px_-2px_var(--brand-glow)]">
                  <FileCode2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold">Review Changes</h2>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                    <GitBranch className="h-3 w-3 text-[var(--success)]" />
                    <code className="truncate font-mono-code text-[10px]">{branchName || 'waycode/task-branch'}</code>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden xs:flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-1 text-[10px] font-bold text-[var(--success)]">
                  <Plus className="h-2.5 w-2.5" /> {additions}
                </span>
                <span className="hidden xs:flex items-center gap-1 rounded-full bg-[var(--error-soft)] px-2 py-1 text-[10px] font-bold text-[var(--error)]">
                  <Minus className="h-2.5 w-2.5" /> {deletions}
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="pressable rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Diff viewer */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#05070c] p-4 font-mono-code text-[11px] leading-[1.7]">
              {diffContent ? (
                lines.map((line, idx) => {
                  let cls = 'text-slate-400'
                  if (line.startsWith('+') && !line.startsWith('+++')) cls = 'bg-emerald-500/[0.08] text-emerald-300'
                  else if (line.startsWith('-') && !line.startsWith('---')) cls = 'bg-red-500/[0.08] text-red-300'
                  else if (line.startsWith('@@')) cls = 'text-sky-400 font-semibold'
                  else if (line.startsWith('diff ') || line.startsWith('index ')) cls = 'text-slate-500'

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.008, 0.4), duration: 0.25 }}
                      className={`-mx-2 whitespace-pre-wrap break-words rounded px-2 ${cls}`}
                    >
                      {line || ' '}
                    </motion.div>
                  )
                })
              ) : (
                <div className="py-14 text-center text-slate-600">
                  <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[var(--brand)]" />
                  <p>Unified diff pending daemon build verification…</p>
                  <p className="mt-1 text-[10px]">The agent is still running its self-healing build loop.</p>
                </div>
              )}
            </div>

            {/* Result banner */}
            <AnimatePresence>
              {(result || decision) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className={`overflow-hidden border-t text-center text-xs font-semibold ${
                    result === 'rejected' || decision === 'rejected'
                      ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-secondary)]'
                      : 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]'
                  }`}
                >
                  <p className="flex items-center justify-center gap-2 py-3">
                    <CheckCircle2 className="h-4 w-4" />
                    {result === 'rejected' || decision === 'rejected'
                      ? 'Task discarded safely — nothing was pushed'
                      : 'Pushed to GitHub · PR created · deployment triggered'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer actions — hidden once a decision has been made */}
            {!decision && (
              <div className="flex gap-2.5 border-t border-[var(--border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  onClick={handleReject}
                  disabled={isRejecting || isApproving || !!result}
                  className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--error)]/30 bg-[var(--error-soft)] py-3 text-xs font-bold text-[var(--error)] hover:bg-[var(--error)]/20 disabled:opacity-50"
                >
                  {isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                  Reject
                </button>

                <button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting || !!result}
                  className="btn-brand pressable flex flex-[1.6] items-center justify-center gap-1.5 rounded-full py-3 text-xs font-bold"
                >
                  {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitPullRequest className="h-3.5 w-3.5" />}
                  Approve & Push to GitHub
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
