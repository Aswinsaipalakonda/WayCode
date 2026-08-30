import { describe, it, expect } from 'vitest'
import { parseToolCalls } from '@/worker/run-task'

describe('parseToolCalls', () => {
  it('parses a plain JSON array', () => {
    const calls = parseToolCalls('[{"tool":"list_files"}]')
    expect(calls).toEqual([{ tool: 'list_files' }])
  })

  it('parses inside a markdown fence', () => {
    const raw = '```json\n[{"tool":"read_file","path":"src/a.ts"},{"tool":"done"}]\n```'
    expect(parseToolCalls(raw)).toHaveLength(2)
    expect(parseToolCalls(raw)[1]).toEqual({ tool: 'done' })
  })

  it('tolerates prose wrapped around the array', () => {
    const raw = 'Here is my plan:\n[{"tool":"list_files"}]\nLet me know.'
    expect(parseToolCalls(raw)).toEqual([{ tool: 'list_files' }])
  })

  it('drops entries missing a tool field', () => {
    const raw = '[{"tool":"done"},{"path":"x.ts"},null,42]'
    expect(parseToolCalls(raw)).toEqual([{ tool: 'done' }])
  })

  it('parses a single tool object as a one-element array', () => {
    expect(parseToolCalls('{"tool":"done"}')).toEqual([{ tool: 'done' }])
  })

  it('returns empty for garbage and truncated arrays', () => {
    expect(parseToolCalls('no json here')).toEqual([])
    expect(parseToolCalls('{"not_a_tool":"done"}')).toEqual([])
    expect(parseToolCalls('[{"tool":"list_files"')).toEqual([])
    expect(parseToolCalls('')).toEqual([])
  })
})
