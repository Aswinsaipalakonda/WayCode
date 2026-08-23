import fs from 'fs'
import path from 'path'
import { createSandbox, generateWorkingDiff, GitAgentError } from '../lib/git-agent'
import { edit_file, list_files, read_file, run_syntax_check } from './tools'

export interface TaskJob {
  taskId: string
  userId: string
  repoName: string
  branchName: string
  prompt: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface TokenUsage {
  input: number
  output: number
}

/** The only AI touchpoint — injectable so the pipeline is testable without keys. */
export type ModelCaller = (messages: ChatMessage[]) => Promise<{ text: string; usage: TokenUsage }>

export interface RunTaskDeps {
  model: ModelCaller
  log: (level: string, message: string) => Promise<void>
  setStatus: (status: string, diffContent?: string, usage?: TokenUsage) => Promise<void>
  sandboxRoot: string
  defaultBranch: string
  token?: string | null
  /** Test hook — clone from an arbitrary URL instead of github.com. */
  cloneUrlOverride?: string
}

const MAX_MODEL_TURNS = 8
const MAX_SELF_HEAL_ATTEMPTS = 3
const MAX_READ_LINES = 400

interface ToolCall {
  tool: string
  path?: string
  content?: string
}

const SYSTEM_PROMPT = `You are WayCode, an autonomous software engineering agent working inside a git sandbox.

You interact with the repository ONLY through deterministic tool calls. Respond with a SINGLE JSON array and nothing else — no prose, no markdown fences.

Available tools:
- {"tool": "list_files"}
- {"tool": "read_file", "path": "relative/path.ts"}
- {"tool": "edit_file", "path": "relative/path.ts", "content": "ENTIRE new file content"}
- {"tool": "done"} — when the task is complete

Rules:
1. Explore first (list_files, read_file) before editing.
2. edit_file replaces the WHOLE file — always send the complete final content.
3. Keep changes minimal and focused on the user's intent.
4. Finish with {"tool": "done"} once all edits are complete.`

/** Extract the first JSON array from a model response, tolerating prose/fences. */
export function parseToolCalls(raw: string): ToolCall[] {
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()

  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return []

  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (c): c is ToolCall =>
        c && typeof c === 'object' && typeof (c as ToolCall).tool === 'string',
    )
  } catch {
    return []
  }
}

/** Resolve a tool path inside the sandbox, rejecting traversal outside it. */
function safePath(sandboxDir: string, relPath: string): string | null {
  const resolved = path.resolve(sandboxDir, relPath)
  const root = path.resolve(sandboxDir)
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null
  return resolved
}

function executeToolCalls(calls: ToolCall[], sandboxDir: string): string[] {
  const results: string[] = []

  for (const call of calls) {
    if (call.tool === 'done') {
      results.push('done: acknowledged')
      continue
    }
    if (call.tool === 'list_files') {
      const files = list_files(sandboxDir)
      results.push(`list_files -> ${files.length} files:\n${files.slice(0, 200).join('\n')}`)
      continue
    }
    if (!call.path) {
      results.push(`error: tool "${call.tool}" requires a path`)
      continue
    }
    if (!safePath(sandboxDir, call.path)) {
      results.push(`error: path "${call.path}" escapes the sandbox`)
      continue
    }
    if (call.tool === 'read_file') {
      const content = read_file(sandboxDir, call.path)
      const truncated =
        content.split('\n').length > MAX_READ_LINES
          ? content.split('\n').slice(0, MAX_READ_LINES).join('\n') + '\n… (truncated)'
          : content
      results.push(`read_file ${call.path} ->\n${truncated}`)
      continue
    }
    if (call.tool === 'edit_file') {
      if (typeof call.content !== 'string') {
        results.push(`error: edit_file requires string content`)
        continue
      }
      results.push(edit_file(sandboxDir, call.path, call.content))
      continue
    }
    results.push(`error: unknown tool "${call.tool}"`)
  }

  return results
}

export async function runTask(job: TaskJob, deps: RunTaskDeps): Promise<void> {
  const sandboxDir = path.join(deps.sandboxRoot, job.taskId)

  try {
    await deps.log('info', `Cloning ${job.repoName} and preparing the workspace…`)
    await deps.setStatus('processing')
    await createSandbox({
      repoName: job.repoName,
      branchName: job.branchName,
      defaultBranch: deps.defaultBranch,
      token: deps.token,
      dest: sandboxDir,
      cloneUrlOverride: deps.cloneUrlOverride,
    })
    await deps.log('success', 'Repository cloned — working branch created.')

    const files = list_files(sandboxDir)
    await deps.log('info', `Scanned the repository — ${files.length} files in scope.`)

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Repository: ${job.repoName}\nIntent: ${job.prompt}\n\nBegin. Respond with a JSON array of tool calls.`,
      },
    ]

    // ---------- ACI tool-call loop ----------
    let modelEdits = 0
    const usageTotal: TokenUsage = { input: 0, output: 0 }
    for (let turn = 1; turn <= MAX_MODEL_TURNS; turn++) {
      await deps.log('info', `Thinking (step ${turn} of ${MAX_MODEL_TURNS})…`)
      const { text: raw, usage } = await deps.model(messages)
      usageTotal.input += usage.input
      usageTotal.output += usage.output

      if (!raw.trim()) {
        await deps.log('error', 'The model returned an empty response.')
        break
      }

      messages.push({ role: 'assistant', content: raw })
      const calls = parseToolCalls(raw)

      if (calls.length === 0) {
        await deps.log('error', 'Could not parse tool calls from the model response — retrying with a correction hint.')
        messages.push({
          role: 'user',
          content: 'Your last reply was not a valid JSON tool-call array. Respond again with ONLY the JSON array.',
        })
        continue
      }

      const edits = calls.filter((c) => c.tool === 'edit_file')
      for (const e of edits) {
        await deps.log('edit', `Applying changes to ${e.path}`)
      }
      modelEdits += edits.length

      const results = executeToolCalls(calls, sandboxDir)
      if (calls.some((c) => c.tool === 'done')) {
        await deps.log('success', 'The agent finished applying changes.')
        break
      }

      messages.push({
        role: 'user',
        content: `TOOL RESULTS:\n${results.join('\n---\n')}\n\nContinue (JSON array only).`,
      })
    }

    if (modelEdits === 0) {
      await deps.log('error', 'No file changes were produced — nothing to review.')
      await deps.setStatus('failed')
      return
    }

    // ---------- Self-healing compiler loop ----------
    let buildPassed = false
    let lastOutput = ''

    for (let attempt = 1; attempt <= MAX_SELF_HEAL_ATTEMPTS; attempt++) {
      await deps.log('syntax_check', `Verifying the build (attempt ${attempt} of ${MAX_SELF_HEAL_ATTEMPTS})…`)
      const check = run_syntax_check(sandboxDir)
      lastOutput = check.output

      if (check.success) {
        buildPassed = true
        await deps.log('success', 'Build verified with zero errors.')
        break
      }

      await deps.log(
        'error',
        `Build issues found — asking the model to self-heal (${attempt}/${MAX_SELF_HEAL_ATTEMPTS}). First error: ${check.output.split('\n').find((l) => l.includes('error TS'))?.slice(0, 160) ?? check.output.slice(0, 160)}`,
      )

      if (attempt === MAX_SELF_HEAL_ATTEMPTS) break

      messages.push({
        role: 'user',
        content: `The syntax/build check FAILED with:\n\n${check.output.slice(0, 6000)}\n\nFix the failing files. Respond with a JSON array of tool calls.`,
      })

      const healResult = await deps.model(messages)
      usageTotal.input += healResult.usage.input
      usageTotal.output += healResult.usage.output
      messages.push({ role: 'assistant', content: healResult.text })
      const calls = parseToolCalls(healResult.text)
      if (calls.length === 0) {
        await deps.log('error', 'Self-heal response was not a valid tool-call array.')
        continue
      }
      for (const e of calls.filter((c) => c.tool === 'edit_file')) {
        await deps.log('edit', `Self-heal edit: ${e.path}`)
      }
      executeToolCalls(calls, sandboxDir)
    }

    if (!buildPassed) {
      await deps.log(
        'error',
        `Build still failing after ${MAX_SELF_HEAL_ATTEMPTS} attempts — escalating for manual review. Last output: ${lastOutput.slice(0, 200)}`,
      )
      await deps.setStatus('failed')
      return
    }

    // ---------- Real diff ----------
    const diff = await generateWorkingDiff(sandboxDir)
    if (!diff.trim()) {
      await deps.log('error', 'The build passed but the working tree is unchanged — nothing to review.')
      await deps.setStatus('failed')
      return
    }

    const additions = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).length
    const deletions = diff.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).length
    await deps.log(
      'success',
      `Changes ready for review: +${additions} / -${deletions} lines · ${(usageTotal.input + usageTotal.output).toLocaleString()} tokens used.`,
    )
    await deps.setStatus('verifying', diff, usageTotal)
  } catch (err: unknown) {
    const message =
      err instanceof GitAgentError
        ? `${err.message}${err.detail ? ` — ${err.detail.slice(0, 300)}` : ''}`
        : err instanceof Error
          ? err.message
          : String(err)
    await deps.log('error', `Something went wrong: ${message}`)
    await deps.setStatus('failed')
  } finally {
    // Sandbox teardown — the diff is persisted, the workspace is disposable.
    try {
      if (fs.existsSync(sandboxDir)) fs.rmSync(sandboxDir, { recursive: true, force: true })
    } catch {
      /* best-effort cleanup */
    }
  }
}
