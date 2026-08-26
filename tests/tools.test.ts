import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { edit_file, list_files, read_file } from '@/worker/tools'
import { executeToolCalls } from '@/worker/run-task'

let sandbox: string

beforeAll(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'waycode-tools-'))
  fs.writeFileSync(path.join(sandbox, 'a.txt'), 'hello')
})

afterAll(() => {
  fs.rmSync(sandbox, { recursive: true, force: true })
})

describe('ACI tools', () => {
  it('lists files recursively while ignoring junk dirs', () => {
    fs.mkdirSync(path.join(sandbox, 'node_modules'), { recursive: true })
    fs.writeFileSync(path.join(sandbox, 'node_modules', 'junk.js'), '')
    fs.mkdirSync(path.join(sandbox, 'sub'))
    fs.writeFileSync(path.join(sandbox, 'sub', 'b.txt'), '')

    const files = list_files(sandbox)
    expect(files).toContain('a.txt')
    expect(files).toContain(path.join('sub', 'b.txt'))
    expect(files.some((f) => f.includes('node_modules'))).toBe(false)
  })

  it('reads files with line numbers', () => {
    expect(read_file(sandbox, 'a.txt')).toBe('1: hello')
    expect(read_file(sandbox, 'missing.txt')).toContain('File not found')
  })

  it('edits files, creating nested directories on demand', () => {
    const result = edit_file(sandbox, path.join('deep', 'nested', 'c.ts'), 'export {}')
    expect(result).toContain('Successfully updated')
    expect(fs.readFileSync(path.join(sandbox, 'deep', 'nested', 'c.ts'), 'utf-8')).toBe('export {}')
  })
})

describe('executeToolCalls (production executor)', () => {
  it('acknowledges done and rejects unknown tools', () => {
    const results = executeToolCalls(
      [{ tool: 'done' }, { tool: 'rm_rf_everything', path: 'x.ts' }],
      sandbox,
    )
    expect(results[0]).toBe('done: acknowledged')
    expect(results[1]).toContain('unknown tool')
  })

  it('blocks path traversal outside the sandbox', () => {
    const results = executeToolCalls(
      [{ tool: 'edit_file', path: '../escape.ts', content: 'evil' }],
      sandbox,
    )
    expect(results[0]).toContain('escapes the sandbox')
    expect(fs.existsSync(path.resolve(sandbox, '..', 'escape.ts'))).toBe(false)
  })

  it('reports errors for tools requiring a path', () => {
    const results = executeToolCalls([{ tool: 'read_file' }], sandbox)
    expect(results[0]).toContain('requires a path')
  })

  it('applies real edits through the executor', () => {
    const results = executeToolCalls(
      [{ tool: 'edit_file', path: 'exec.txt', content: 'written' }],
      sandbox,
    )
    expect(results[0]).toContain('Successfully updated')
    expect(fs.readFileSync(path.join(sandbox, 'exec.txt'), 'utf-8')).toBe('written')
  })
})
