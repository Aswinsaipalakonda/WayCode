'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Terminal, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface LogItem {
  id: number
  log_level: string
  message: string
  timestamp: string
}

export function TelemetryStreamer({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<LogItem[]>([])
  const supabase = createClient()

  useEffect(() => {
    // 1. Fetch initial logs
    async function fetchInitialLogs() {
      const { data } = await supabase
        .from('task_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('timestamp', { ascending: true })

      if (data) setLogs(data)
    }

    fetchInitialLogs()

    // 2. Realtime CDC subscription on task_logs table
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
  }, [taskId, supabase])

  return (
    <div className="bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-3 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          Realtime Execution Telemetry (Supabase CDC)
        </span>
        <span className="flex items-center gap-1 text-[9px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live CDC Stream
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-500 py-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Connecting to Realtime Postgres Log Channel...</span>
        </div>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 leading-relaxed">
            <span className="text-slate-500 shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={`shrink-0 font-bold ${
              log.log_level === 'tool_call' ? 'text-purple-400' :
              log.log_level === 'syntax_check' ? 'text-amber-400' :
              log.log_level === 'error' ? 'text-red-400' : 'text-emerald-400'
            }`}>
              [{log.log_level.toUpperCase()}]
            </span>
            <span className="text-slate-300 break-all">{log.message}</span>
          </div>
        ))
      )}
    </div>
  )
}
