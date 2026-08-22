'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FilePen,
  Hammer,
  Info,
  Loader2,
  ScanLine,
  Wrench,
  CircleX,
} from 'lucide-react'

interface LogItem {
  id: number
  log_level: string
  message: string
  timestamp: string
}

const LEVEL_META: Record<string, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'text-sky-300', Icon: Info },
  tool_call: { cls: 'text-cyan-300', Icon: Wrench },
  edit: { cls: 'text-teal-300', Icon: FilePen },
  build: { cls: 'text-amber-300', Icon: Hammer },
  syntax_check: { cls: 'text-amber-300', Icon: ScanLine },
  error: { cls: 'text-red-400', Icon: CircleX },
  success: { cls: 'text-emerald-400', Icon: Info },
}

export function TelemetryStreamer({ taskId, active }: { taskId: string; active?: boolean }) {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

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
    if (autoScroll && scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll, collapsed])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || collapsed) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  const copyAllLogs = async () => {
    if (logs.length === 0) return
    try {
      await navigator.clipboard.writeText(
        logs.map((l) => `[${new Date(l.timestamp).toLocaleTimeString([], { hour12: false })}] [${l.log_level}] ${l.message}`).join('\n'),
      )
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[var(--term-bg)]">
      {/* Panel chrome */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
          Agent activity
          {logs.length > 0 && (
            <span className="shrink-0 rounded-full bg-white/8 px-1.5 py-px font-mono-code text-[9px] tracking-normal text-slate-400 normal-case">
              {logs.length} {logs.length === 1 ? 'event' : 'events'}
            </span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-0.5">
          {/* Live / paused / done state */}
          {active ? (
            autoScroll ? (
              <span className="mr-1 flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            ) : (
              <span className="mr-1 flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                Paused
              </span>
            )
          ) : (
            <span className="mr-1 flex items-center gap-1 rounded-full bg-white/6 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
              Ended
            </span>
          )}

          <button
            type="button"
            onClick={copyAllLogs}
            disabled={logs.length === 0}
            aria-label={copied ? 'Logs copied' : 'Copy all logs'}
            title={copied ? 'Copied!' : 'Copy all logs'}
            className="pressable rounded-lg p-1.5 text-slate-500 hover:bg-white/8 hover:text-slate-200 disabled:opacity-40"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand activity' : 'Collapse activity'}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="pressable rounded-lg p-1.5 text-slate-500 hover:bg-white/8 hover:text-slate-200"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </span>
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`space-y-1 overflow-y-auto p-3 pt-0 font-mono-code text-[10.5px] leading-relaxed text-slate-300 transition-all duration-300 ${
          collapsed ? 'max-h-0 opacity-0' : 'max-h-44 opacity-100'
        }`}
      >
        {logs.length === 0 ? (
          <p className="flex items-center gap-2 pb-2 text-slate-500">
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-cyan-300" />
            Waiting for the agent to start
            <span className="term-caret" />
          </p>
        ) : (
          logs.map((log) => {
            const levelMeta = LEVEL_META[log.log_level] ?? { cls: 'text-emerald-400', Icon: Info }
            const Icon = levelMeta.Icon
            return (
              <div key={log.id} className="group/log flex items-start gap-2 anim-fade-in">
                <Icon className={`mt-px h-3 w-3 shrink-0 ${levelMeta.cls}`} />
                <span className="w-11 shrink-0 text-slate-600">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
                <span className="min-w-0 break-all">{log.message}</span>
              </div>
            )
          })
        )}
      </div>

      {!autoScroll && logs.length > 0 && !collapsed && (
        <button
          type="button"
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }}
          className="absolute bottom-12 right-4 flex items-center gap-1 rounded-full btn-brand px-2.5 py-1.5 text-[9px] font-bold shadow-lg"
        >
          <ArrowDownToLine className="h-2.5 w-2.5" /> Jump to latest
        </button>
      )}
    </div>
  )
}
