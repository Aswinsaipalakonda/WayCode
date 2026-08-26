import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Redis from 'ioredis'
import { decryptSecret } from '../lib/crypto'
import { resolveProvider, type EffectiveProvider } from '../lib/byok'
import { sendPushToUser } from '../lib/push'
import { runTask, type ChatMessage, type ModelCaller, type TaskContext } from './run-task'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6381'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[Daemon] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

/** Service-role client â€” the daemon is trusted server-side infrastructure. */
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const redis = new Redis(REDIS_URL, { lazyConnect: true })

async function writeLog(taskId: string, logLevel: string, message: string) {
  console.log(`[Task ${taskId.slice(0, 8)}] ${message}`)
  await supabase.from('task_logs').insert({ task_id: taskId, log_level: logLevel, message })
}

async function updateJobStatus(
  taskId: string,
  status: string,
  extra?: {
    diffContent?: string
    usage?: { input: number; output: number }
    model?: string
    userId?: string
  },
) {
  const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (extra?.diffContent) updateData.diff_content = extra.diffContent
  if (extra?.model) updateData.model_used = extra.model
  if (extra?.usage) {
    updateData.input_tokens = Math.round(extra.usage.input)
    updateData.output_tokens = Math.round(extra.usage.output)
  }
  await supabase.from('task_jobs').update(updateData).eq('id', taskId)

  // Review-ready / failed are the moments a developer wants to hear about
  // while away from the app (PRD §5.7). Fire-and-forget — never blocks jobs.
  if ((status === 'verifying' || status === 'failed') && extra?.userId) {
    void sendPushToUser(supabase, extra.userId, {
      title: status === 'verifying' ? 'Changes ready for review' : 'Task needs attention',
      body:
        status === 'verifying'
          ? 'The build passed — approve the diff to ship it to GitHub.'
          : 'The agent hit a wall on this one. Check the task logs.',
      url: '/tasks',
      tag: taskId,
    })
  }
}

interface UserSettingsRow {
  provider: string | null
  api_key: string | null
  selected_model: string | null
  custom_base_url: string | null
  github_token: string | null
}

function chatEndpointFor(provider: EffectiveProvider, customBaseUrl: string | null): string {
  const base = (customBaseUrl || '').replace(/\/+$/, '')
  switch (provider) {
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    case 'anthropic':
      return 'https://api.anthropic.com/v1/messages'
    case 'custom':
      return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
    case 'openrouter':
    default:
      return 'https://openrouter.ai/api/v1/chat/completions'
  }
}

function makeModelCaller(apiKey: string, providerRaw: string, model: string, customBaseUrl: string | null): ModelCaller {
  const provider = resolveProvider(providerRaw, apiKey, customBaseUrl)
  const endpoint = chatEndpointFor(provider, customBaseUrl)

  return async (messages: ChatMessage[]) => {
    let res: Response

    if (provider === 'anthropic') {
      // Native Messages API — system prompt is a top-level field.
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n')
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          ...(system ? { system } : {}),
          messages: messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        }),
      })
    } else {
      // OpenAI-compatible surface (OpenRouter / Gemini OpenAI layer / custom).
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.2,
        }),
      })
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Model API error HTTP ${res.status}: ${detail.slice(0, 300)}`)
    }

    if (provider === 'anthropic') {
      const data = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>
        usage?: { input_tokens?: number; output_tokens?: number }
      }
      const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
      return {
        text,
        usage: {
          input: data.usage?.input_tokens ?? 0,
          output: data.usage?.output_tokens ?? 0,
        },
      }
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const text = data.choices?.[0]?.message?.content ?? ''
    return {
      text,
      usage: {
        input: data.usage?.prompt_tokens ?? 0,
        output: data.usage?.completion_tokens ?? 0,
      },
    }
  }
}

async function processJob(jobPayload: string) {
  const job = JSON.parse(jobPayload) as {
    taskId: string
    userId: string
    repoName: string
    branchName: string
    prompt: string
    context?: TaskContext | null
  }

  try {
    // Secrets never ride through Redis â€” the daemon self-serves via service role.
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
      await writeLog(job.taskId, 'error', 'No AI provider key is configured â€” add one in Settings to run tasks.')
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

    // runTask accumulates usage across all model turns and reports the totals
    // alongside the final status — persist them straight onto the job row.
    await runTask(
      {
        taskId: job.taskId,
        userId: job.userId,
        repoName: job.repoName,
        branchName: job.branchName,
        prompt: job.prompt,
        context: job.context ?? null,
      },
      {
        model: makeModelCaller(apiKey, provider, model, settings?.custom_base_url ?? null),
        log: (level, message) => writeLog(job.taskId, level, message),
        setStatus: (status, diffContent, usage) =>
          updateJobStatus(job.taskId, status, { diffContent, model, usage, userId: job.userId }),
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

/** Liveness marker for /api/health — best-effort, never interrupts the loop. */
function startHeartbeat() {
  const beat = async () => {
    try {
      await supabase
        .from('daemon_status')
        .upsert({ id: 'singleton', last_beat: new Date().toISOString() }, { onConflict: 'id' })
    } catch (err) {
      console.error('[Daemon] Heartbeat failed:', err)
    }
  }
  void beat()
  return setInterval(() => void beat(), 30_000)
}

async function startDaemon() {
  console.log('🚀 WayCode ACI daemon running — waiting for jobs…')
  startHeartbeat()
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
