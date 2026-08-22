/**
 * End-to-end pipeline test — no network, no API keys.
 *
 * Verifies the full Milestone-A execution loop against local bare repos:
 *   clone → ACI tool-call loop (stubbed model) → self-heal with real tsc
 *   → real git diff → approve flow (apply diff → commit → push).
 *
 * Run: npm run test:pipeline
 */
import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { pathToFileURL } from 'url'
import { runTask, type ChatMessage, type ModelCaller } from '../src/worker/run-task'
import { landApprovedDiff } from '../src/lib/git-agent'

const git = (args: string[], cwd?: string) =>
  execFileSync('git', args, { cwd, encoding: 'utf-8', windowsHide: true })

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'waycode-e2e-'))
let passed = 0
const ok = (name: string) => {
  passed++
  console.log(`  ✅ ${name}`)
}

// ---------- Fixture: a tiny strict TypeScript project ----------
const ORIGIN = path.join(TMP, 'origin.git')
const WORK = path.join(TMP, 'seed-work')

fs.mkdirSync(path.join(WORK, 'src'), { recursive: true })
fs.writeFileSync(
  path.join(WORK, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        strict: true,
        target: 'es2020',
        module: 'esnext',
        moduleResolution: 'bundler',
        skipLibCheck: true,
        noEmit: true,
        types: [],
        lib: ['es2020'],
      },
      include: ['src'],
    },
    null,
    2,
  ),
)
fs.writeFileSync(
  path.join(WORK, 'src', 'math.ts'),
  'export function add(a: number, b: number): number {\n  return a + b\n}\n',
)
fs.writeFileSync(
  path.join(WORK, 'src', 'index.ts'),
  'import { add } from "./math"\n\nexport const initialSum = add(1, 2)\n',
)

git(['init', '-b', 'main', WORK])
git(['config', 'user.email', 'seed@test'], WORK)
git(['config', 'user.name', 'Seed'], WORK)
git(['add', '-A'], WORK)
git(['commit', '-m', 'seed'], WORK)
git(['clone', '--bare', WORK, ORIGIN])

// ---------- Scripted model: buggy edit → real tsc failure → self-heal fix ----------
const BUGGY = 'import { add } from "./math"\n\nconst total: number = add(1, "2")\nexport { total }\n'
const FIXED = 'import { add } from "./math"\n\nexport const greeting = `sum=${add(1, 2)}`\n'

const script: string[] = [
  JSON.stringify([{ tool: 'list_files' }]),
  JSON.stringify([{ tool: 'read_file', path: 'src/index.ts' }]),
  JSON.stringify([
    { tool: 'edit_file', path: 'src/index.ts', content: BUGGY },
    { tool: 'done' },
  ]),
  // Self-heal turn (triggered by the real tsc failure above):
  JSON.stringify([{ tool: 'edit_file', path: 'src/index.ts', content: FIXED }]),
]

const stubModel: ModelCaller = async (messages: ChatMessage[]) => {
  const last = messages[messages.length - 1]
  if (script.length === 0) throw new Error('model script exhausted')
  const next = script.shift()!
  void last
  return next
}

// ---------- Log/status capture ----------
const logs: Array<{ level: string; message: string }> = []
const statuses: string[] = []
const deps = {
  model: stubModel,
  log: async (level: string, message: string) => {
    logs.push({ level, message })
    console.log(`      [${level}] ${message}`)
  },
  setStatus: async (status: string) => {
    statuses.push(status)
  },
  sandboxRoot: path.join(TMP, 'sandboxes'),
  defaultBranch: 'main',
  token: null,
  cloneUrlOverride: pathToFileURL(ORIGIN).href,
}

const TASK_ID = 'test-task-0001'
const BRANCH = 'waycode/task-e2e01'

// ---------- Phase 1: generation pipeline ----------
async function main() {
console.log('\n▶ Phase 1 — clone → ACI loop → self-heal → diff')
let capturedDiff = ''
await runTask(
  { taskId: TASK_ID, userId: 'user-1', repoName: 'local/fixture', branchName: BRANCH, prompt: 'Replace index with a greeting using add()' },
  {
    ...deps,
    setStatus: async (status, diffContent) => {
      statuses.push(status)
      if (diffContent) capturedDiff = diffContent
    },
  },
)

assert.ok(statuses.includes('processing'), 'status: processing')
assert.ok(statuses.includes('verifying'), 'status: verifying (not failed)')
assert.ok(!statuses.includes('failed'), `no failure — got ${statuses.join(',')}`)
assert.ok(capturedDiff.includes('greeting'), 'diff contains the fixed change')
assert.ok(!capturedDiff.includes('"2"'), 'diff does not contain the buggy line')
assert.ok(
  logs.some((l) => l.level === 'error' && l.message.includes('Build issues found')),
  'self-heal detected the real tsc failure',
)
assert.ok(
  logs.some((l) => l.level === 'success' && l.message.includes('Build verified')),
  'self-heal recovered and build passed',
)
ok('clone + branch creation')
ok('ACI tool-call loop executed (list/read/edit/done)')
ok('self-healing loop fixed a real compiler error')
ok('real git diff generated with expected content')

// ---------- Phase 2: approve flow (apply → commit → push) ----------
console.log('\n▶ Phase 2 — approve: replay diff → commit → push to origin')
const landDir = path.join(TMP, 'land')
await landApprovedDiff({
  repoName: 'local/fixture',
  branchName: BRANCH,
  defaultBranch: 'main',
  diff: capturedDiff,
  token: null,
  commitMessage: 'waycode: e2e test landing',
  dest: landDir,
  cloneUrlOverride: pathToFileURL(ORIGIN).href,
})

// Verify the commit actually landed on the branch in the bare origin.
const branchHead = git(['log', `-1`, '--format=%s %H', BRANCH], ORIGIN).trim()
assert.ok(branchHead.includes('waycode: e2e test landing'), 'pushed commit found on origin branch')
const branchTree = git(['show', `${BRANCH}:src/index.ts`], ORIGIN).trim()
assert.ok(branchTree.includes('greeting'), 'pushed file content matches the reviewed diff')
ok('approve flow pushed the exact reviewed diff to the remote branch')

// ---------- Phase 3: PR creation without token ----------
console.log('\n▶ Phase 3 — PR guard')
const { createPullRequest } = await import('../src/lib/git-agent')
const pr = await createPullRequest({
  repoName: 'local/fixture',
  branchName: BRANCH,
  defaultBranch: 'main',
  title: 't',
  body: 'b',
  token: null,
})
assert.strictEqual(pr, null, 'PR creation returns null without a token')
ok('PR creation safely skipped without GitHub token')

// ---------- Cleanup ----------
fs.rmSync(TMP, { recursive: true, force: true })
console.log(`\n🎉 pipeline test: ${passed} phase assertions passed — all green`)
process.exit(0)
}

main().catch((err) => {
  console.error('❌ pipeline test failed:', err)
  try {
    fs.rmSync(TMP, { recursive: true, force: true })
  } catch {
    /* already cleaned */
  }
  process.exit(1)
})
