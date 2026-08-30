'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  FilePlus2,
  FileText,
  FileX2,
  GitBranch,
  GitPullRequest,
  Layers,
  Loader2,
  MessageSquareWarning,
  Minus,
  Plus,
  ThumbsDown,
  X,
} from 'lucide-react'

interface RetryQueuedInfo {
  taskId: string
  branchName: string
  prompt: string
}

interface DiffReviewModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  branchName: string
  diffContent: string
  /** Set once the user has decided — the modal becomes read-only history. */
  decision?: 'pushed' | 'rejected' | null
  /** Fired when a rejection re-queues as a fresh task carrying reviewer feedback. */
  onRetryQueued?: (info: RetryQueuedInfo) => void
  /** Fired when the user approves and ships changes to GitHub. */
  onApproved?: (prUrl?: string | null) => void
  /** Fired when the task is rejected. */
  onRejected?: () => void
}

export interface FileDiff {
  filename: string
  status: 'added' | 'modified' | 'deleted'
  additions: number
  deletions: number
  lines: string[]
  cleanCode: string
}

/**
 * Parses raw git diff text into structured per-file diff sections.
 */
export function parseMultiFileDiff(rawDiff: string): FileDiff[] {
  if (!rawDiff || !rawDiff.trim()) return []
  const files: FileDiff[] = []
  const rawLines = rawDiff.split('\n')
  let currentFile: FileDiff | null = null
  const addedCodeLines: string[] = []

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]

    if (line.startsWith('diff --git ')) {
      if (currentFile) {
        currentFile.cleanCode = addedCodeLines.join('\n')
        files.push(currentFile)
      }
      addedCodeLines.length = 0

      // Extract filename from "diff --git a/path b/path"
      const match = line.match(/diff --git a\/(.+) b\/(.+)/)
      const filename = match ? match[2] : line.replace('diff --git ', '').trim()

      currentFile = {
        filename,
        status: 'modified',
        additions: 0,
        deletions: 0,
        lines: [line],
        cleanCode: '',
      }
      continue
    }

    if (!currentFile) {
      currentFile = {
        filename: 'changes.patch',
        status: 'modified',
        additions: 0,
        deletions: 0,
        lines: [],
        cleanCode: '',
      }
    }

    if (line.startsWith('new file mode')) {
      currentFile.status = 'added'
    } else if (line.startsWith('deleted file mode')) {
      currentFile.status = 'deleted'
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      currentFile.additions++
      addedCodeLines.push(line.slice(1))
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      currentFile.deletions++
    } else if (!line.startsWith('@@') && !line.startsWith('index ') && !line.startsWith('---') && !line.startsWith('+++')) {
      addedCodeLines.push(line.startsWith(' ') ? line.slice(1) : line)
    }

    currentFile.lines.push(line)
  }

  if (currentFile) {
    currentFile.cleanCode = addedCodeLines.join('\n')
    files.push(currentFile)
  }

  return files
}

export function DiffReviewModal({
  isOpen,
  onClose,
  taskId,
  branchName,
  diffContent,
  decision = null,
  onRetryQueued,
  onApproved,
  onRejected,
}: DiffReviewModalProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [reason, setReason] = useState('')
  const [selectedFileTab, setSelectedFileTab] = useState<string>('all')
  const [copiedFile, setCopiedFile] = useState<string | null>(null)

  const fileDiffs = useMemo(() => parseMultiFileDiff(diffContent), [diffContent])

  const totalAdditions = useMemo(
    () => fileDiffs.reduce((acc, f) => acc + f.additions, 0),
    [fileDiffs],
  )
  const totalDeletions = useMemo(
    () => fileDiffs.reduce((acc, f) => acc + f.deletions, 0),
    [fileDiffs],
  )

  const handleCopyCode = async (filename: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedFile(filename)
      toast.success(`Copied ${filename} contents to clipboard`)
      setTimeout(() => setCopiedFile(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

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
        onApproved?.(data.pullRequestUrl)
        toast.success('Approved & pushed to GitHub', {
          description: `Branch ${branchName || 'working branch'} pushed · PR created · WhatsApp confirmation dispatched.`,
        })
        setTimeout(onClose, 1800)
      } else {
        toast.error('Approval failed', {
          description: data.error || 'The daemon could not push this change.',
        })
      }
    } catch {
      toast.error('Network error', { description: 'Could not reach the approval endpoint.' })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async (retryReason?: string) => {
    setIsRejecting(true)
    try {
      const res = await fetch('/api/tasks/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, ...(retryReason ? { reason: retryReason } : {}) }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error('Rejection failed', { description: data.error || 'Could not discard this task.' })
        return
      }

      setResult('rejected')
      onRejected?.()
      if (data.retried) {
        toast.success('Re-running with your feedback', {
          description: `A fresh attempt was queued · ${data.branchName}`,
        })
        onRetryQueued?.({
          taskId: data.taskId,
          branchName: data.branchName,
          prompt: data.prompt,
        })
      } else if (
        data.message?.includes('repository could not be resolved') ||
        data.message?.includes('queueing the retry')
      ) {
        toast.info('Task rejected', { description: data.message })
      } else {
        toast.info('Task rejected', { description: 'The working branch was discarded. Nothing was pushed.' })
      }
      setTimeout(onClose, 1400)
    } catch {
      toast.error('Network error', { description: 'Could not reach the rejection endpoint.' })
    } finally {
      setIsRejecting(false)
    }
  }

  const displayedFiles = useMemo(() => {
    if (selectedFileTab === 'all') return fileDiffs
    return fileDiffs.filter((f) => f.filename === selectedFileTab)
  }, [fileDiffs, selectedFileTab])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            aria-label="Close review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Diff review"
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative flex h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[24px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] sm:h-[min(88vh,840px)] sm:rounded-[24px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_2px_12px_-2px_var(--brand-glow)]">
                  <FileCode2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--foreground)]">Review Code Changes</h2>
                    <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--brand)]">
                      {fileDiffs.length} file{fileDiffs.length === 1 ? '' : 's'} changed
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                    <GitBranch className="h-3 w-3 text-[var(--success)]" />
                    <code className="truncate font-mono-code text-[10.5px]">{branchName || 'waycode/task-branch'}</code>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--success)] xs:flex">
                  <Plus className="h-3 w-3" /> {totalAdditions}
                </span>
                <span className="hidden items-center gap-1 rounded-full bg-[var(--error-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--error)] xs:flex">
                  <Minus className="h-3 w-3" /> {totalDeletions}
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

            {/* Multi-File Tab Navigation */}
            {fileDiffs.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedFileTab('all')}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedFileTab === 'all'
                      ? 'bg-[var(--brand)] text-white shadow-xs'
                      : 'text-[var(--foreground-secondary)] hover:bg-[var(--card)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  All Files ({fileDiffs.length})
                </button>

                {fileDiffs.map((file) => {
                  const isSelected = selectedFileTab === file.filename
                  return (
                    <button
                      key={file.filename}
                      type="button"
                      onClick={() => setSelectedFileTab(file.filename)}
                      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-[var(--brand)] bg-[var(--card)] text-[var(--brand)] shadow-xs'
                          : 'border-transparent text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--card)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {file.status === 'added' ? (
                        <FilePlus2 className="h-3.5 w-3.5 text-[var(--success)]" />
                      ) : file.status === 'deleted' ? (
                        <FileX2 className="h-3.5 w-3.5 text-[var(--error)]" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-[var(--brand)]" />
                      )}
                      <span className="font-mono-code text-[11px]">{file.filename}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9.5px] font-bold ${
                          file.status === 'added'
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : file.status === 'deleted'
                              ? 'bg-[var(--error-soft)] text-[var(--error)]'
                              : 'bg-[var(--brand-soft)] text-[var(--brand)]'
                        }`}
                      >
                        +{file.additions}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Diff content cards */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#05070c] p-4 font-mono-code text-[11px] leading-[1.7]">
              {fileDiffs.length > 0 ? (
                <div className="space-y-5">
                  {displayedFiles.map((file) => (
                    <div
                      key={file.filename}
                      className="overflow-hidden rounded-xl border border-white/10 bg-[#080c16] shadow-sm"
                    >
                      {/* Individual File Header Card */}
                      <div className="flex items-center justify-between border-b border-white/10 bg-[#0c1222] px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.status === 'added' ? (
                            <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              <Plus className="h-3 w-3" /> NEW FILE
                            </span>
                          ) : file.status === 'deleted' ? (
                            <span className="flex items-center gap-1 rounded-md bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                              <Minus className="h-3 w-3" /> DELETED
                            </span>
                          ) : (
                            <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                              MODIFIED
                            </span>
                          )}
                          <span className="truncate font-mono-code text-xs font-bold text-slate-200">
                            {file.filename}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-[10.5px]">
                            <span className="text-emerald-400 font-semibold">+{file.additions}</span>
                            <span className="text-rose-400 font-semibold">-{file.deletions}</span>
                          </div>

                          {file.cleanCode && (
                            <button
                              type="button"
                              onClick={() => void handleCopyCode(file.filename, file.cleanCode)}
                              title={`Copy entire content of ${file.filename}`}
                              className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                              {copiedFile === file.filename ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* File Diff Lines */}
                      <div className="overflow-x-auto p-3.5 font-mono-code text-[11px] leading-relaxed">
                        {file.lines.map((line, idx) => {
                          let cls = 'text-slate-400'
                          if (line.startsWith('+') && !line.startsWith('+++'))
                            cls = 'bg-emerald-500/[0.12] text-emerald-300 font-medium'
                          else if (line.startsWith('-') && !line.startsWith('---'))
                            cls = 'bg-red-500/[0.12] text-red-300 font-medium'
                          else if (line.startsWith('@@')) cls = 'text-sky-400 font-bold bg-sky-500/10'
                          else if (
                            line.startsWith('diff ') ||
                            line.startsWith('index ') ||
                            line.startsWith('new file')
                          )
                            cls = 'text-slate-500 text-[10px]'

                          return (
                            <div
                              key={idx}
                              className={`-mx-2 whitespace-pre-wrap break-words rounded px-2 py-0.5 ${cls}`}
                            >
                              {line || ' '}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-600">
                  <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[var(--brand)]" />
                  <p>Unified diff pending daemon build verification…</p>
                  <p className="mt-1 text-[10px]">The agent is running its self-healing build loop.</p>
                </div>
              )}
            </div>

            {/* Rejection feedback — tell the agent what to do differently */}
            <AnimatePresence>
              {showRejectPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden border-t border-[var(--border)] bg-[var(--surface)]"
                >
                  <div className="space-y-2.5 px-4 pt-3">
                    <label
                      htmlFor={`reject-reason-${taskId}`}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground-secondary)]"
                    >
                      <MessageSquareWarning className="h-3.5 w-3.5 text-[var(--warning)]" />
                      What should the agent do differently?
                    </label>
                    <textarea
                      id={`reject-reason-${taskId}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value.slice(0, 1000))}
                      rows={3}
                      maxLength={1000}
                      placeholder="e.g. Please change the hero subtitle and use lighter background cards… (optional)"
                      className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2.5 text-xs leading-relaxed outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)]"
                    />
                    <p className="text-right text-[9.5px] font-medium text-[var(--muted-foreground)]">
                      Leave empty to discard without a retry · {reason.length}/1000
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                      ? result === 'rejected' && reason.trim()
                        ? 'Rejected — a fresh attempt with your feedback was queued'
                        : 'Task discarded safely — nothing was pushed'
                      : 'Pushed to GitHub · PR created · WhatsApp confirmation sent 🚀'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer actions */}
            {decision || result ? (
              <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--success)]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Changes approved & pushed to GitHub</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="pressable rounded-full border border-[var(--border-strong)] bg-[var(--card)] px-5 py-2 text-xs font-bold text-[var(--foreground)] shadow-xs hover:border-[var(--brand)]"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="border-t border-[var(--border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {showRejectPanel ? (
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        setShowRejectPanel(false)
                        setReason('')
                      }}
                      disabled={isRejecting}
                      className="pressable flex flex-1 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] py-3 text-xs font-bold text-[var(--foreground-secondary)] hover:border-[var(--error)]/40 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => void handleReject()}
                      disabled={isRejecting || isApproving || !!result}
                      className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--error)]/30 bg-[var(--error-soft)] py-3 text-xs font-bold text-[var(--error)] hover:bg-[var(--error)]/20 disabled:opacity-50"
                    >
                      {isRejecting && !reason.trim() ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-3.5 w-3.5" />
                      )}
                      Discard only
                    </button>
                    <button
                      onClick={() => void handleReject(reason.trim())}
                      disabled={isRejecting || isApproving || !!result || !reason.trim()}
                      className="btn-brand pressable flex flex-[1.6] items-center justify-center gap-1.5 rounded-full py-3 text-xs font-bold disabled:opacity-40"
                    >
                      {isRejecting && !!reason.trim() ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                      )}
                      Retry with feedback
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setShowRejectPanel(true)}
                      disabled={isRejecting || isApproving || !!result}
                      className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--error)]/30 bg-[var(--error-soft)] py-3 text-xs font-bold text-[var(--error)] hover:bg-[var(--error)]/20 disabled:opacity-50"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Reject
                    </button>

                    <button
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting || !!result}
                      className="btn-brand pressable flex flex-[1.6] items-center justify-center gap-1.5 rounded-full py-3 text-xs font-bold"
                    >
                      {isApproving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <GitPullRequest className="h-3.5 w-3.5" />
                      )}
                      Approve & Push to GitHub
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
