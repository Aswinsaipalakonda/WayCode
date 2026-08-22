'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowDownToLine } from 'lucide-react'

interface LogItem {
  id: number
  log_level: string
  message: string
  timestamp: string
}

const LEVEL_STYLES: Record<string, string> = {
  info: 'text-sky-300',
  tool_call: 'text-cyan-300',
  edit: 'text-teal-300',
  build: 'text-amber-300',
  syntax_check: 'text-amber-300',
  error: 'text-red-400',
  success: 'text-emerald-400',
}

export function TelemetryStreamer({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabaseRef.current = supabase

    async function fetchInitialLogs() {
      const { data } = await supabase
        .from('task_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('timestamp', { ascending: true })

      if (data) setLogs(data as LogItem[])
    }

    fetchInitialLogs()

    const channel = supabase
      .channel(`task_logs_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_logs',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as LogItem])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[var(--term-bg)]">
      {/* Panel chrome */}
      <div className="flex items-center justify-between px-3.5 py-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
          Activity
        </span>
        <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative max-h-44 space-y-1 overflow-y-auto p-3 font-mono-code text-[10.5px] leading-relaxed text-slate-300"
      >
        {logs.length === 0 ? (
          <p className="py-1 text-slate-500">
            <span className="term-caret" /> Getting things ready…
          </p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 anim-fade-in">
              <span className="shrink-0 text-slate-600">
                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
              </span>
              <span className={`shrink-0 font-bold ${LEVEL_STYLES[log.log_level] ?? 'text-emerald-400'}`}>
                [{log.log_level.toUpperCase()}]
              </span>
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {!autoScroll && logs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }}
          className="absolute bottom-12 right-4 flex items-center gap-1 rounded-full btn-brand px-2.5 py-1.5 text-[9px] font-bold"
        >
          <ArrowDownToLine className="h-2.5 w-2.5" /> Jump to latest
        </button>
      )}
    </div>
  )
}
