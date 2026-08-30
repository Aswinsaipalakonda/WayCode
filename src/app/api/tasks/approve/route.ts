import fs from 'fs'
import os from 'os'
import path from 'path'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptSecret } from '@/lib/crypto'
import {
  createPullRequest,
  GitAgentError,
  landApprovedDiff,
} from '@/lib/git-agent'
import { sendPushToUser } from '@/lib/push'
import { triggerDeployHook } from '@/lib/deploy-trigger'
import { recordDeployEvent } from '@/lib/deploy-notify'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let sandboxDir: string | null = null

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

    // Ownership check — a user may only approve their own jobs.
    const { data: job, error: jobError } = await supabase
      .from('task_jobs')
      .select('id, user_id, prompt, status, branch_name, diff_content, repo_id, created_at')
      .eq('id', taskId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!['verifying', 'build_verified'].includes((job.status as string) || '')) {
      return NextResponse.json(
        { error: `Task is not reviewable in state "${job.status}"` },
        { status: 409 },
      )
    }
    if (!job.diff_content || !job.branch_name) {
      return NextResponse.json({ error: 'Task has no diff to land' }, { status: 409 })
    }

    // Resolve repo name + default branch + optional deploy hook.
    let repoName = ''
    let defaultBranch = 'main'
    let deployWebhookUrl: string | null = null
    if (job.repo_id) {
      const { data: repo } = await supabase
        .from('repositories')
        .select('repo_name, default_branch, deploy_webhook_url')
        .eq('id', job.repo_id)
        .single()
      if (repo) {
        repoName = repo.repo_name
        defaultBranch = repo.default_branch || 'main'
        deployWebhookUrl = repo.deploy_webhook_url || null
      }
    }
    if (!repoName) {
      return NextResponse.json({ error: 'Task repository could not be resolved' }, { status: 409 })
    }

    // GitHub write token (encrypted at rest) — required to push.
    const admin = createAdminClient()
    const { data: settings } = await admin
      .from('user_settings')
      .select('github_token')
      .eq('user_id', user.id)
      .single()

    const githubToken = settings?.github_token?.startsWith('v1:')
      ? decryptSecret(settings.github_token)
      : settings?.github_token

    if (!githubToken) {
      return NextResponse.json(
        { error: 'No GitHub token on file — sign out and back in with GitHub to re-authorize.' },
        { status: 428 },
      )
    }

    await supabase.from('task_logs').insert({
      task_id: taskId,
      log_level: 'info',
      message: `[APPROVED] Landing the reviewed diff on branch ${job.branch_name}…`,
    })

    sandboxDir = path.join(os.tmpdir(), `waycode-land-${taskId}`)
    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true })
    } catch {
      /* stale dir from a previous run */
    }

    // Replay diff → commit → push.
    const { pushedBranch } = await landApprovedDiff({
      repoName,
      branchName: job.branch_name as string,
      defaultBranch,
      diff: job.diff_content as string,
      token: githubToken,
      commitMessage: `waycode: ${String(job.prompt).slice(0, 80)}\n\nApplied by WayCode Agent for task ${taskId}`,
      dest: sandboxDir,
    })

    // Open a PR into the default branch.
    let pr: { url: string; number: number } | null = null
    try {
      pr = await createPullRequest({
        repoName,
        branchName: pushedBranch,
        defaultBranch,
        title: String(job.prompt).slice(0, 120),
        body: `## WayCode task\n\n**Intent:** ${job.prompt}\n\n**Task ID:** \`${taskId}\`\n\nGenerated autonomously by WayCode and approved by @${user.user_metadata?.user_name || user.email}.`,
        token: githubToken,
      })
    } catch (err: unknown) {
      // Push already succeeded; PR failure is non-fatal but reported.
      const detail = err instanceof GitAgentError ? err.detail ?? err.message : String(err)
      await supabase.from('task_logs').insert({
        task_id: taskId,
        log_level: 'error',
        message: `[PR FAILED] Branch was pushed but opening the pull request failed: ${detail.slice(0, 300)}`,
      })
    }

    const { error: updateJobError } = await admin
      .from('task_jobs')
      .update({
        status: 'completed',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (updateJobError) {
      console.error('[Approve Task] Failed to update task_jobs status:', updateJobError)
    }

    await supabase.from('task_logs').insert({
      task_id: taskId,
      log_level: 'success',
      message: pr
        ? `[SHIPPED] Pushed ${pushedBranch} and opened pull request #${pr.number}: ${pr.url}`
        : `[SHIPPED] Pushed branch ${pushedBranch} to GitHub.`,
    })

    // Outbound deploy trigger (Dokku / Coolify / CodePipeline / custom)
    if (deployWebhookUrl) {
      void (async () => {
        try {
          const triggerRes = await triggerDeployHook({
            webhookUrl: deployWebhookUrl,
            repoName,
            branchName: pushedBranch,
            taskId,
            prompt: job.prompt,
            prUrl: pr?.url ?? null,
          })

          if (triggerRes.success) {
            await supabase.from('task_logs').insert({
              task_id: taskId,
              log_level: 'info',
              message: `[DEPLOY HOOK] Dispatched outbound deploy webhook for ${repoName}.`,
            })
          } else {
            await supabase.from('task_logs').insert({
              task_id: taskId,
              log_level: 'error',
              message: `[DEPLOY HOOK FAILED] Outbound trigger error: ${triggerRes.error || 'Failed to dispatch'}`,
            })
          }
        } catch (hookErr: unknown) {
          console.error('[Deploy Hook Trigger] Error:', hookErr)
        }
      })()
    }

    // "Shipped" push — closes the loop for users who left after approving.
    void sendPushToUser(admin, user.id, {
      title: 'Shipped to GitHub 🚀',
      body: pr
        ? `Pull request #${pr.number} opened — deployment will follow automatically.`
        : `Branch ${pushedBranch} pushed.`,
      url: '/tasks',
      tag: taskId,
    })

    // Out-of-band WhatsApp alert matching workflow.png topology layout
    const filesChanged = typeof job.diff_content === 'string'
      ? (job.diff_content.match(/^diff --git/gm) || []).length || 1
      : 1
    const buildTimeSeconds = job.created_at
      ? Math.max(1, Math.round((Date.now() - new Date(job.created_at).getTime()) / 1000))
      : 35

    void recordDeployEvent(
      admin,
      {
        id: taskId,
        user_id: user.id,
        prompt: job.prompt,
        repo_name: repoName,
        branch_name: pushedBranch,
        commit_hash: pushedBranch.replace('waycode/task-', '').slice(0, 7),
        files_changed: filesChanged,
        build_time_seconds: buildTimeSeconds,
        pr_url: pr?.url ?? null,
      },
      {
        success: true,
        source: 'GitHub',
        url: pr?.url ?? null,
      },
    )

    return NextResponse.json({
      success: true,
      message: 'Job approved & pushed',
      branch: pushedBranch,
      pullRequestUrl: pr?.url ?? null,
    })
  } catch (err: unknown) {
    const detail =
      err instanceof GitAgentError && err.detail ? err.detail : err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Failed to approve task', detail: detail.slice(0, 500) },
      { status: 500 },
    )
  } finally {
    if (sandboxDir) {
      try {
        fs.rmSync(sandboxDir, { recursive: true, force: true })
      } catch {
        /* best-effort cleanup */
      }
    }
  }
}
