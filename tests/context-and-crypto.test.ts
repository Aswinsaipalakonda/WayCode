import { describe, it, expect } from 'vitest'
import { formatContextBlock } from '@/worker/run-task'
import { decryptSecret, encryptSecret, isEncrypted } from '@/lib/crypto'

// crypto.ts reads the key lazily (inside masterKey), so setting it here is safe.
process.env.SETTINGS_ENCRYPTION_KEY ||= 'test-master-key-waycode-vitest'

describe('formatContextBlock', () => {
  it('returns empty string for no context', () => {
    expect(formatContextBlock(null)).toBe('')
    expect(formatContextBlock(undefined)).toBe('')
    expect(formatContextBlock({})).toBe('')
  })

  it('renders file path and issue number', () => {
    const block = formatContextBlock({ filePath: 'src/a.ts', issueNumber: 42 })
    expect(block).toContain('- Relevant file path: src/a.ts')
    expect(block).toContain('- Linked GitHub issue: #42')
  })

  it('prefers resolved issue reference over bare number', () => {
    const block = formatContextBlock({
      issueNumber: 7,
      issueReference: 'GitHub issue #7 (open): Fix login',
    })
    expect(block).toContain('GitHub issue #7 (open): Fix login')
    expect(block).not.toContain('#7\n')
  })

  it('wraps pasted error output in error tags', () => {
    const block = formatContextBlock({ errorStack: 'TypeError: boom' })
    expect(block).toContain('<error>\nTypeError: boom\n</error>')
  })
})

describe('secret vault crypto', () => {
  it('roundtrips plaintext through v1 ciphertext', () => {
    const secret = 'sk-or-v1-super-secret-key-123'
    const cipher = encryptSecret(secret)

    expect(isEncrypted(cipher)).toBe(true)
    expect(cipher.startsWith('v1:')).toBe(true)
    expect(cipher).not.toContain(secret)
    expect(decryptSecret(cipher)).toBe(secret)
  })

  it('produces unique ciphertexts per call (random IV)', () => {
    expect(encryptSecret('same-input')).not.toBe(encryptSecret('same-input'))
  })

  it('rejects tampered ciphertext via GCM auth tag', () => {
    const cipher = encryptSecret('payload')
    const parts = cipher.split(':')
    const data = Buffer.from(parts[3], 'base64')
    data[0] ^= 0xff
    parts[3] = data.toString('base64')

    expect(() => decryptSecret(parts.join(':'))).toThrow()
  })

  it('flags unencrypted values', () => {
    expect(isEncrypted('plain-api-key')).toBe(false)
    expect(isEncrypted(null)).toBe(false)
  })
})
