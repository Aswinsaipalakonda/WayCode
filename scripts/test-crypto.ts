/**
 * Crypto unit test — AES-256-GCM vault encryption roundtrip.
 * Requires SETTINGS_ENCRYPTION_KEY (set inline by CI or the shell).
 */
import assert from 'assert'
import { decryptSecret, encryptSecret, isEncrypted } from '../src/lib/crypto'

function main() {
  const secret = 'sk-or-v1-abc123-Ünïcode-🔐-key'
  const ciphertext = encryptSecret(secret)

  assert.ok(ciphertext.startsWith('v1:'), 'ciphertext carries version prefix')
  assert.ok(!ciphertext.includes(secret), 'plaintext must never appear in ciphertext')
  assert.ok(isEncrypted(ciphertext), 'isEncrypted recognizes own output')
  assert.ok(!isEncrypted('sk-or-v1-plainkey'), 'isEncrypted rejects plaintext')
  assert.strictEqual(decryptSecret(ciphertext), secret, 'roundtrip preserves value')

  // Unique IV per call.
  assert.notStrictEqual(encryptSecret(secret), ciphertext, 'IV randomization')

  // Tamper detection.
  const parts = ciphertext.split(':')
  parts[3] = Buffer.from('tampered').toString('base64')
  let threw = false
  try {
    decryptSecret(parts.join(':'))
  } catch {
    threw = true
  }
  assert.ok(threw, 'tampered ciphertext must fail GCM auth')

  console.log('✅ crypto roundtrip: all assertions passed')
}

main()
