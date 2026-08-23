import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/tasks — task history for the signed-in user.
 *
 * Modes:
 *  - ?conversationId=<uuid>  → tasks belonging to one conversation
 *  - default                 → most recent 30, oldest→newest
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const conversationId = url.searchParams.get('conversationId')

    let query = supabase
      .from('task_jobs')
      .select('id, prompt, branch_name, status, created_at, input_tokens, output_tokens, model_used, conversation_id')

    if (conversationId) {
      query = query.eq('conversation_id', conversationId).limit(50)
    } else {
      query = query.limit(30)
    }

    const { data: tasks, error: queryError } = await query.order('created_at', { ascending: false })

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      tasks: [...(tasks ?? [])].reverse(),
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    )
  }
}
