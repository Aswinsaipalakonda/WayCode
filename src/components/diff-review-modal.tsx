'use client'

import { useState } from 'react'
import { FileCode, CheckCircle2, XCircle, Loader2, GitPullRequest, GitBranch } from 'lucide-react'

interface DiffReviewModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  branchName: string
  diffContent: string
}

export function DiffReviewModal({
  isOpen,
  onClose,
  taskId,
  branchName,
  diffContent,
}: DiffReviewModalProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleApprove = async () => {
    setIsApproving(true)
    setStatusMessage(null)

    try {
      const res = await fetch('/api/tasks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setStatusMessage('🚀 Changes approved! Branch pushed & PR created successfully.')
        setTimeout(() => onClose(), 2000)
      } else {
        setStatusMessage(data.error || 'Approval failed')
      }
    } catch (e) {
      setStatusMessage('Network error during approval')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await fetch('/api/tasks/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col justify-between shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-base font-bold">Mobile Git Diff Review</h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
            <code className="bg-[var(--muted)] px-2 py-0.5 rounded text-[11px] font-mono">
              {branchName || 'waycode/task-branch'}
            </code>
          </div>
        </div>

        {/* Diff Content Viewer */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-xs space-y-1">
          {diffContent ? (
            diffContent.split('\n').map((line, idx) => {
              let color = 'text-slate-300'
              if (line.startsWith('+')) color = 'text-emerald-400 bg-emerald-950/40 px-1'
              if (line.startsWith('-')) color = 'text-red-400 bg-red-950/40 px-1'
              if (line.startsWith('@')) color = 'text-sky-400 font-bold'

              return (
                <div key={idx} className={color}>
                  {line}
                </div>
              )
            })
          ) : (
            <div className="text-slate-500 py-8 text-center">
              Unified diff content pending daemon verification...
            </div>
          )}
        </div>

        {/* Action Status Notification */}
        {statusMessage && (
          <div className="p-3 bg-emerald-500/10 border-t border-emerald-500/20 text-emerald-500 text-xs text-center font-medium">
            {statusMessage}
          </div>
        )}

        {/* Footer Action Controls */}
        <div className="p-4 border-t border-[var(--border)] flex gap-3">
          <button
            onClick={handleReject}
            disabled={isRejecting || isApproving}
            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-xs py-3 rounded-full transition-colors flex items-center justify-center gap-1.5"
          >
            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject Task
          </button>

          <button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold text-xs py-3 rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-md"
          >
            {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
            Approve & Push to GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
