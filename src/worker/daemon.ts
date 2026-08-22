import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Redis from 'ioredis'
import { decryptSecret } from '../lib/crypto'
import { runTask, type ChatMessage, type ModelCaller } from './run-task'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6381'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[Daemon] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

/** Service-role client — the daemon is trusted server-side infrastructure. */
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const redis = new Redis(REDIS_URL, { lazyConnect: true })

async function writeLog(taskId: string, logLevel: string, message: string) {
  console.log(`[Task ${taskId.slice(0, 8)}] ${message}`)
  await supabase.from('task_logs').insert({ task_id: taskId, log_level: logLevel, message })
}

async function updateJobStatus(taskId: string, status: string, diffContent?: string) {
  const updateData: Record<string, unknown> = { status: status, updated_at: new Date().toISOString() }
  if (diffContent) updateData.diff_content = diffContent
  await supabase.from('task_jobs').update(updateData).eq('id', taskId)
}

interface UserSettingsRow {
  provider: string | null
  api_key: string | null
  selected_model: string | null
  custom_base_url: string | null
  github_token: string | null
}

function chatEndpointFor(provider: string, customBaseUrl: string | null): string {
  const base = (customBaseUrl || '').replace(/\/+$/, '')
  switch (provider) {
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    case 'custom':
      return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
    case 'openrouter':
    default:
      return 'https://openrouter.ai/api/v1/chat/completions'
  }
}

function makeModelCaller(apiKey: string, provider: string, model: string, customBaseUrl: string | null): ModelCaller {
  const endpoint = chatEndpointFor(provider, customBaseUrl)

  return async (messages: ChatMessage[]) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Model API error HTTP ${res.status}: ${detail.slice(0, 300)}`)
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content ?? ''
  }
}

async function processJob(jobPayload: string) {
  const job = JSON.parse(jobPayload) as {
    taskId: string
    userId: string
    repoName: string
    branchName: string
    prompt: string
  }

  try {
    // Secrets never ride through Redis — the daemon self-serves via service role.
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('provider, api_key, selected_model, custom_base_url, github_token')
      .eq('user_id', job.userId)
      .single()
      .returns<UserSettingsRow>()

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw new Error(`Failed to load user settings: ${settingsError.message}`)
    }

    let apiKey = ''
    if (settings?.api_key) {
      apiKey = settings.api_key.startsWith('v1:') ? decryptSecret(settings.api_key) : settings.api_key
    }
    apiKey = apiKey || process.env.OPENROUTER_API_KEY || ''

    if (!apiKey) {
      await writeLog(job.taskId, 'error', 'No AI provider key is configured — add one in Settings to run tasks.')
      await updateJobStatus(job.taskId, 'failed')
      return
    }

    const githubToken = settings?.github_token?.startsWith('v1:')
      ? decryptSecret(settings.github_token)
      : settings?.github_token

    const model =
      settings?.selected_model ||
      process.env.WAYCODE_DEFAULT_MODEL ||
      'google/gemini-2.0-flash-exp:free'
    const provider = settings?.provider || 'openrouter'

    const { data: repoRow } = await supabase
      .from('repositories')
      .select('default_branch')
      .eq('repo_name', job.repoName)
      .limit(1)
      .maybeSingle()

    await runTask(
      {
        taskId: job.taskId,
        userId: job.userId,
        repoName: job.repoName,
        branchName: job.branchName,
        prompt: job.prompt,
      },
      {
        model: makeModelCaller(apiKey, provider, model, settings?.custom_base_url ?? null),
        log: (level, message) => writeLog(job.taskId, level, message),
        setStatus: (status, diffContent) => updateJobStatus(job.taskId, status, diffContent),
        sandboxRoot: path.join(process.cwd(), '.sandbox'),
        defaultBranch: repoRow?.default_branch || 'main',
        token: githubToken,
      },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Task ${job.taskId.slice(0, 8)}] fatal:`, message)
    await writeLog(job.taskId, 'error', `Something went wrong: ${message}`)
    await updateJobStatus(job.taskId, 'failed')
  }
}

async function startDaemon() {
  console.log('🚀 WayCode ACI daemon running — waiting for jobs…')
  if (!redis.status || redis.status === 'wait') {
    await redis.connect().catch((err: unknown) => {
      console.error('[Daemon] Redis connect failed:', err)
      process.exit(1)
    })
  }

  while (true) {
    try {
      const popped = await redis.blpop('waycode:tasks', 5)
      if (popped) {
        await processJob(popped[1])
      }
    } catch (err) {
      console.error('[Daemon Loop Error]:', err)
      await new Promise((res) => setTimeout(res, 5000))
    }
  }
}

startDaemon()
