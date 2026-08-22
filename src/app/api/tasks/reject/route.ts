import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await request.json()
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    // Ownership check — a user may only reject their own jobs.
    const { data: job, error: jobError } = await supabase
      .from('task_jobs')
      .select('id, user_id, status')
      .eq('id', taskId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Nothing was ever pushed during generation — rejection is purely a state
    // transition; the working branch only exists in the (already torn-down)
    // sandbox, so there is nothing to clean up on the remote.
    await supabase
      .from('task_jobs')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', taskId)

    await supabase.from('task_logs').insert({
      task_id: taskId,
      log_level: 'info',
      message: `[REJECTED] User rejected the diff on review. Nothing was pushed.`,
    })

    return NextResponse.json({ success: true, message: 'Job rejected' })
  } catch {
    return NextResponse.json({ error: 'Failed to reject task' }, { status: 500 })
  }
}
