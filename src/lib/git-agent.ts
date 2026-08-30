import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const GIT_TIMEOUT = 120_000
const GIT_MAX_BUFFER = 20 * 1024 * 1024

export class GitAgentError extends Error {
  constructor(
    message: string,
    readonly detail?: string,
  ) {
    super(message)
  }
}

/** Run a git command safely (args array — no shell interpolation). */
export async function runGit(args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout: GIT_TIMEOUT,
      maxBuffer: GIT_MAX_BUFFER,
      windowsHide: true,
    })
    return stdout
  } catch (err: unknown) {
    const e = err as { stderr?: string; stdout?: string; message?: string }
    const detail = [e.stderr, e.stdout, e.message].filter(Boolean).join('\n').trim()
    throw new GitAgentError(`git ${args[0]} failed`, detail)
  }
}

/** Authenticated (or anonymous, for public repos) HTTPS clone URL. */
export function cloneUrlFor(repoName: string, token?: string | null): string {
  const clean = repoName.replace(/\.git$/, '')
  return token
    ? `https://x-access-token:${encodeURIComponent(token)}@github.com/${clean}.git`
    : `https://github.com/${clean}.git`
}

export interface SandboxOptions {
  repoName: string
  branchName: string
  defaultBranch: string
  token?: string | null
  dest: string
  /** Test hook — clone from an arbitrary URL instead of github.com. */
  cloneUrlOverride?: string
}

/**
 * Shallow-clone the repo into `dest` and create the working branch.
 * The sandbox is configured with autocrlf off so diffs stay byte-exact.
 */
export async function createSandbox(opts: SandboxOptions): Promise<void> {
  fs.mkdirSync(path.dirname(opts.dest), { recursive: true })
  const url = opts.cloneUrlOverride ?? cloneUrlFor(opts.repoName, opts.token)
  // --config applies BEFORE checkout, so the working tree is byte-exact LF
  // regardless of the machine's global autocrlf — keeps diffs/replays stable.
  await runGit([
    'clone',
    '--depth',
    '1',
    '--branch',
    opts.defaultBranch,
    '--config',
    'core.autocrlf=false',
    url,
    opts.dest,
  ])
  await runGit(['config', 'core.autocrlf', 'false'], opts.dest)
  await runGit(['checkout', '-b', opts.branchName], opts.dest)
}

/**
 * Stage every change and return the unified diff of the working tree
 * against the base commit (includes added files, excludes untracked junk
 * because everything is staged).
 */
export async function generateWorkingDiff(sandboxDir: string): Promise<string> {
  await runGit(['add', '-A'], sandboxDir)
  const diff = await runGit(['diff', '--cached'], sandboxDir)
  // NOTE: never trim the tail — git apply requires the patch to end with a newline.
  return diff
}

export interface LandOptions {
  repoName: string
  branchName: string
  defaultBranch: string
  diff: string
  token?: string | null
  commitMessage: string
  dest: string
  /** Test hook — clone from an arbitrary URL instead of github.com. */
  cloneUrlOverride?: string
}

/**
 * Re-materialize an approved diff on a fresh clone and push the working branch.
 * Stateless by design: the generation sandbox is gone by review time, so the
 * diff is replayed onto a pristine base — no server-side state to lose.
 * Returns the remote branch ref that was pushed.
 */
export async function landApprovedDiff(opts: LandOptions): Promise<{ pushedBranch: string; sandboxDir: string }> {
  if (!opts.diff.trim()) {
    throw new GitAgentError('Refusing to land an empty diff')
  }

  await createSandbox({
    repoName: opts.repoName,
    branchName: opts.branchName,
    defaultBranch: opts.defaultBranch,
    token: opts.token,
    dest: opts.dest,
    cloneUrlOverride: opts.cloneUrlOverride,
  })

  // Replay the reviewed diff onto the pristine base.
  await new Promise<void>((resolve, reject) => {
    const child = execFile(
      'git',
      ['apply', '--whitespace=nowarn', '-'],
      { cwd: opts.dest, timeout: GIT_TIMEOUT, maxBuffer: GIT_MAX_BUFFER, windowsHide: true },
      (err) => (err ? reject(new GitAgentError('git apply failed', String(err))) : resolve()),
    )
    child.stdin?.end(opts.diff)
    child.on('error', () => reject(new GitAgentError('git apply could not start')))
  })

  await runGit(['config', 'user.name', 'WayCode Agent'], opts.dest)
  await runGit(['config', 'user.email', 'agent@waycode.dev'], opts.dest)
  await runGit(['add', '-A'], opts.dest)
  await runGit(['commit', '-m', opts.commitMessage], opts.dest)
  await runGit(['push', '-u', '--force', 'origin', `HEAD:refs/heads/${opts.branchName}`], opts.dest)

  return { pushedBranch: opts.branchName, sandboxDir: opts.dest }
}

export interface PullRequestResult {
  url: string
  number: number
}

/** Open a PR from the working branch into the default branch via the GitHub REST API. */
export async function createPullRequest(params: {
  repoName: string
  branchName: string
  defaultBranch: string
  title: string
  body: string
  token?: string | null
}): Promise<PullRequestResult | null> {
  if (!params.token) return null

  const res = await fetch(`https://api.github.com/repos/${params.repoName}/pulls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: params.title.slice(0, 120),
      head: params.branchName,
      base: params.defaultBranch,
      body: params.body.slice(0, 4000),
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    // 422 = PR already exists for this head/base — not fatal.
    if (res.status === 422) return null
    throw new GitAgentError(`GitHub PR creation failed (HTTP ${res.status})`, detail)
  }

  const data = (await res.json()) as { html_url: string; number: number }
  return { url: data.html_url, number: data.number }
}
