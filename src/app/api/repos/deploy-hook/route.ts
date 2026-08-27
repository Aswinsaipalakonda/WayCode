import { createClient } from '@/lib/supabase/server'
import { isSafeWebhookUrl } from '@/lib/deploy-trigger'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repoId = searchParams.get('repoId')

    if (!repoId) {
      return NextResponse.json({ error: 'repoId is required' }, { status: 400 })
    }

    const { data: repo, error } = await supabase
      .from('repositories')
      .select('id, repo_name, deploy_webhook_url')
      .eq('id', repoId)
      .eq('user_id', user.id)
      .single()

    if (error || !repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      repoId: repo.id,
      repoName: repo.repo_name,
      deployWebhookUrl: repo.deploy_webhook_url || null,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || !body.repoId) {
      return NextResponse.json({ error: 'repoId is required' }, { status: 400 })
    }

    const { repoId, webhookUrl } = body

    if (webhookUrl && typeof webhookUrl === 'string') {
      const check = isSafeWebhookUrl(webhookUrl)
      if (!check.safe) {
        return NextResponse.json(
          { error: check.reason || 'Invalid webhook URL' },
          { status: 400 },
        )
      }
    }

    // Verify ownership
    const { data: repo, error: repoErr } = await supabase
      .from('repositories')
      .select('id, repo_name')
      .eq('id', repoId)
      .eq('user_id', user.id)
      .single()

    if (repoErr || !repo) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    const cleanUrl = webhookUrl && typeof webhookUrl === 'string' ? webhookUrl.trim() : null

    const { error: updateError } = await supabase
      .from('repositories')
      .update({
        deploy_webhook_url: cleanUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', repoId)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      repoId,
      deployWebhookUrl: cleanUrl,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repoId = searchParams.get('repoId')

    if (!repoId) {
      return NextResponse.json({ error: 'repoId is required' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('repositories')
      .update({
        deploy_webhook_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', repoId)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, repoId })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
