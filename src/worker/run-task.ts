import fs from 'fs'
import path from 'path'
import { createSandbox, generateWorkingDiff, GitAgentError } from '../lib/git-agent'
import { edit_file, list_files, read_file, run_syntax_check } from './tools'

export interface TaskContext {
  filePath?: string
  issueNumber?: number
  issueReference?: string | null
  errorStack?: string
}

export interface TaskJob {
  taskId: string
  userId: string
  repoName: string
  branchName: string
  prompt: string
  /** Optional intent attachments (PRD §7.3) folded into the first turn only. */
  context?: TaskContext | null
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

const MAX_MODEL_TURNS = 15
const MAX_SELF_HEAL_ATTEMPTS = 3
const MAX_READ_LINES = 400

interface ToolCall {
  tool: string
  path?: string
  content?: string
}

const SYSTEM_PROMPT = `You are WayCode, an autonomous senior software engineering agent working inside a git repository sandbox.

You interact with the repository ONLY through deterministic tool calls. Respond with a JSON array of tool calls.

Available tools:
- {"tool": "list_files"} — lists files in the workspace
- {"tool": "read_file", "path": "relative/path.ts"} — reads file contents
- {"tool": "edit_file", "path": "relative/path.ts", "content": "ENTIRE new file content"} — creates new file or replaces existing file
- {"tool": "done"} — marks the task as complete

Rules:
1. When asked to build, update, or create a project/feature (e.g. landing page, portfolio, UI component), actively CREATE and write all necessary files (HTML, CSS, JS, React, etc.) using edit_file.
2. edit_file creates new files if they do not exist, or updates existing ones. Always output complete, self-contained, high-quality code.
3. Deliver visually stunning, modern, responsive designs with beautiful aesthetics.
4. Finish with {"tool": "done"} once all edits are applied.`

/** Extract tool calls from a model response, tolerating prose, fences, thinking tags, and single/multiple objects. */
export function parseToolCalls(raw: string): ToolCall[] {
  let text = raw.trim()

  // 1. Strip reasoning / thinking tags (<think>...</think>)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  // 2. Extract from markdown code fences if present
  const fenceMatches = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
  if (fenceMatches.length > 0) {
    const combined = fenceMatches.map((m) => m[1].trim()).join('\n')
    text = combined
  }

  // 3. Try parsing JSON array directly
  const startArr = text.indexOf('[')
  const endArr = text.lastIndexOf(']')
  if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
    try {
      const parsed = JSON.parse(text.slice(startArr, endArr + 1))
      if (Array.isArray(parsed)) {
        const valid = parsed.filter(
          (c): c is ToolCall =>
            c && typeof c === 'object' && typeof (c as ToolCall).tool === 'string',
        )
        if (valid.length > 0) return valid
      }
    } catch {
      // Continue to fallback parsing
    }
  }

  // 4. Try parsing single JSON object
  const startObj = text.indexOf('{')
  const endObj = text.lastIndexOf('}')
  if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
    try {
      const parsed = JSON.parse(text.slice(startObj, endObj + 1))
      if (parsed && typeof parsed === 'object' && typeof parsed.tool === 'string') {
        return [parsed as ToolCall]
      }
    } catch {
      // Continue to multi-object scanning
    }
  }

  // 5. Scan for individual JSON objects: {"tool": ...}
  const tools: ToolCall[] = []
  const objRegex = /\{[\s\r\n]*"tool"[\s\r\n]*:[\s\S]*?\}(?=\s*(?:\{|\[|\]|\n|$))/g
  const matches = text.match(objRegex)
  if (matches) {
    for (const m of matches) {
      try {
        const obj = JSON.parse(m)
        if (obj && typeof obj === 'object' && typeof obj.tool === 'string') {
          tools.push(obj as ToolCall)
        }
      } catch {}
    }
  }

  return tools
}

/** Resolve a tool path inside the sandbox, rejecting traversal outside it. */
export function safePath(sandboxDir: string, relPath: string): string | null {
  const resolved = path.resolve(sandboxDir, relPath)
  const root = path.resolve(sandboxDir)
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null
  return resolved
}

export function executeToolCalls(calls: ToolCall[], sandboxDir: string): string[] {
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

/** Render optional context attachments as an extra section of the first turn. */
export function formatContextBlock(ctx?: TaskContext | null): string {
  if (!ctx) return ''
  const parts: string[] = []
  if (ctx.filePath) parts.push(`- Relevant file path: ${ctx.filePath}`)
  if (ctx.issueReference) parts.push(`- Linked issue: ${ctx.issueReference}`)
  else if (ctx.issueNumber) parts.push(`- Linked GitHub issue: #${ctx.issueNumber}`)
  if (ctx.errorStack) parts.push(`- Pasted error output:\n<error>\n${ctx.errorStack}\n</error>`)
  if (parts.length === 0) return ''
  return `\n\nContext attachments:\n${parts.join('\n')}`
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
    await deps.log('info', `Scanned repository structure — ${files.length} file(s) in scope.`)

    const contextBlock = formatContextBlock(job.context)
    if (contextBlock) {
      await deps.log('info', 'Context attachments folded into the task brief.')
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Repository: ${job.repoName}\nIntent: ${job.prompt}${contextBlock}\n\nBegin. Respond with a JSON array of tool calls.`,
      },
    ]

    // ---------- ACI tool-call loop ----------
    let modelEdits = 0
    const usageTotal: TokenUsage = { input: 0, output: 0 }
    for (let turn = 1; turn <= MAX_MODEL_TURNS; turn++) {
      if (turn === 1) {
        await deps.log('info', 'Analyzing requirements and designing code architecture…')
      } else {
        await deps.log('info', `Evaluating implementation state (step ${turn} of ${MAX_MODEL_TURNS})…`)
      }

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
        await deps.log('warning', 'Parsing model response — guiding agent to tool format…')
        messages.push({
          role: 'user',
          content: 'Your last reply was not a valid JSON tool-call array. Respond again with ONLY the JSON array of tool calls, e.g. [{"tool": "edit_file", "path": "index.html", "content": "..."}]',
        })
        continue
      }

      // Contextual action logs per tool
      for (const call of calls) {
        if (call.tool === 'list_files') {
          await deps.log('info', 'Exploring repository structure and file paths…')
        } else if (call.tool === 'read_file' && call.path) {
          await deps.log('info', `Reading ${call.path} to understand existing code…`)
        } else if (call.tool === 'edit_file' && call.path) {
          const isExisting = fs.existsSync(path.join(sandboxDir, call.path))
          await deps.log('edit', `${isExisting ? 'Updating' : 'Creating'} ${call.path}…`)
        }
      }

      const edits = calls.filter((c) => c.tool === 'edit_file')
      modelEdits += edits.length

      const results = executeToolCalls(calls, sandboxDir)
      if (calls.some((c) => c.tool === 'done')) {
        await deps.log('success', 'The agent completed all code modifications.')
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
