import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { taskId } = await request.json()

    await supabase
      .from('task_jobs')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', taskId)

    await supabase.from('task_logs').insert({
      task_id: taskId,
      log_level: 'error',
      message: `[REJECTED] User rejected task diff on mobile. Discarded sandbox branch.`,
    })

    return NextResponse.json({ success: true, message: 'Job rejected' })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Failed to reject task' }, { status: 500 })
  }
}
