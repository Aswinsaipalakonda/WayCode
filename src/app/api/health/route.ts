import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/** A processing job untouched for this long is considered wedged. */
const STALE_JOB_MINUTES = 30
/** Daemon heartbeats every 30s; two missed beats means trouble. */
const HEARTBEAT_STALE_SECONDS = 90

export async function GET() {
  const report: Record<string, unknown> = { ok: true, checkedAt: new Date().toISOString() }
  let degraded = false

  // --- Redis queue depth ---
  let queueDepth: number | null = null
  let redisOk = true
  try {
    const { redis } = await import('@/lib/redis')
    try {
      await redis.connect()
    } catch {
      /* already connected */
    }
    queueDepth = await redis.llen('waycode:tasks')
    redis.disconnect()
  } catch {
    redisOk = false
    degraded = true
  }
  report.redis = { ok: redisOk, queueDepth }

  // --- Daemon heartbeat + stale jobs ---
  try {
    const supabase = createAdminClient()
    const [{ data: beat }, { count: staleCount }] = await Promise.all([
      supabase.from('daemon_status').select('last_beat').eq('id', 'singleton').maybeSingle(),
      supabase
        .from('task_jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['processing', 'queued'])
        .lt('updated_at', new Date(Date.now() - STALE_JOB_MINUTES * 60_000).toISOString()),
    ])

    const lastBeat = beat?.last_beat ? new Date(beat.last_beat as string) : null
    const secondsSinceBeat = lastBeat ? Math.round((Date.now() - lastBeat.getTime()) / 1000) : null
    if (secondsSinceBeat === null || secondsSinceBeat > HEARTBEAT_STALE_SECONDS) {
      degraded = true
    }

    report.daemon = { lastBeat, secondsSinceBeat, staleJobs: staleCount ?? 0 }
  } catch (err) {
    degraded = true
    report.daemon = { error: err instanceof Error ? err.message : 'unavailable' }
  }

  report.ok = !degraded
  return NextResponse.json(report, { status: degraded ? 503 : 200 })
}
