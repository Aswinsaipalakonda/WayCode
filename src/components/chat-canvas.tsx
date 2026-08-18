'use client'

import { useState } from 'react'
import { Folder, Plus, ArrowRight, Terminal, Sparkles, CheckCircle2, Loader2 } from 'lucide-react'

interface Repository {
  id: string
  repo_name: string
  default_branch: string
}

interface ChatCanvasProps {
  repositories: Repository[]
  selectedRepo: Repository | null
  onSelectRepo: (repo: Repository) => void
}

export function ChatCanvas({ repositories, selectedRepo, onSelectRepo }: ChatCanvasProps) {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedJob, setSubmittedJob] = useState<{
    taskId: string
    branchName: string
    message: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRepoMenuOpen, setIsRepoMenuOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          repoId: selectedRepo?.id,
          repoName: selectedRepo?.repo_name || 'Default Repo',
        }),
      })

      const data = await res.json()

      if (res.status === 202 && data.success) {
        setSubmittedJob({
          taskId: data.taskId,
          branchName: data.branchName,
          message: data.message,
        })
        setPrompt('')
      } else {
        setError(data.error || 'Failed to submit task to queue')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const shortRepoName = selectedRepo 
    ? selectedRepo.repo_name.split('/')[1] || selectedRepo.repo_name 
    : 'Select Repository'

  return (
    <div className="flex-1 flex flex-col justify-between items-center h-full p-4 md:p-8 max-w-3xl w-full mx-auto relative overflow-y-auto">
      {/* Top Welcome Title */}
      <div className="w-full text-center space-y-2 mt-8 md:mt-12">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          WayCode Autonomous Gateway
        </h1>
        <p className="text-xs md:text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          Offload your software engineering tasks to a persistent cloud AI daemon. Review diffs and approve on mobile.
        </p>
      </div>

      {/* Main Centered Input Box matching Antigravity 2.0 Screenshot */}
      <div className="w-full max-w-xl my-auto space-y-4">
        {/* Project Selector Pill (Antigravity 2.0 Style) */}
        <div className="flex justify-center relative">
          <button
            onClick={() => setIsRepoMenuOpen(!isRepoMenuOpen)}
            className="flex items-center gap-2 bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] px-4 py-1.5 rounded-full text-xs font-semibold text-[var(--foreground)] transition-all shadow-xs"
          >
            <Folder className="w-4 h-4 text-[var(--primary)]" />
            <span>{shortRepoName}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">Ctrl+;</span>
          </button>

          {isRepoMenuOpen && (
            <div className="absolute top-full mt-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-[10px] font-bold text-[var(--muted-foreground)] px-2 py-1 uppercase tracking-wider">
                Select Project Context
              </div>
              {repositories.length === 0 ? (
                <div className="p-3 text-center text-xs text-[var(--muted-foreground)]">
                  No projects synced.
                </div>
              ) : (
                repositories.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => {
                      onSelectRepo(repo)
                      setIsRepoMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-[var(--muted)] text-[var(--foreground)] text-left"
                  >
                    <span className="truncate">{repo.repo_name}</span>
                    {selectedRepo?.id === repo.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Antigravity 2.0 Clean Input Bar */}
        <form onSubmit={handleSubmit} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-xl space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything, @ to mention, / for actions"
            rows={3}
            className="w-full bg-transparent border-0 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-0 focus:outline-hidden resize-none"
          />

          {/* Action Row: Attachment (+) and Send (→) */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              title="Attach File or Context"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!prompt.trim() || isSubmitting}
              className="p-2 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 text-white transition-all flex items-center justify-center"
              title="Send Intent"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Submission Error Card */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Submission Telemetry Card */}
        {submittedJob && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-md space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5">
                <Terminal className="w-4 h-4" />
                Task Queued (HTTP 202 Accepted)
              </span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full font-semibold">
                Redis Buffered
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Task assigned to <span className="font-semibold text-[var(--foreground)]">{shortRepoName}</span>. Target working branch: <code className="bg-[var(--muted)] px-1 py-0.5 rounded">{submittedJob.branchName}</code>.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-[11px] text-[var(--muted-foreground)] pb-12 md:pb-4 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
        <span>WayCode Mobile Gateway — Zero Local Compute</span>
      </div>
    </div>
  )
}
