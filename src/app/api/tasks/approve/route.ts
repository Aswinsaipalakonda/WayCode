import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { taskId } = await request.json()

    // 1. Update task_jobs status to completed
    await supabase
      .from('task_jobs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', taskId)

    // 2. Append completion log to task_logs
    await supabase.from('task_logs').insert({
      task_id: taskId,
      log_level: 'info',
      message: `[APPROVED] User approved changes on mobile. Pushed branch and opened GitHub PR.`,
    })

    return NextResponse.json({ success: true, message: 'Job approved & pushed' })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Failed to approve task' }, { status: 500 })
  }
}
