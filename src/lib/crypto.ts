import crypto from 'crypto'

/**
 * AES-256-GCM encryption for secrets at rest (BYOK API keys, GitHub tokens).
 *
 * Ciphertext format: `v1:<iv-b64>:<authTag-b64>:<data-b64>`
 * The key is derived from SETTINGS_ENCRYPTION_KEY via scrypt with a fixed salt,
 * so rotating the master key invalidates all stored ciphertexts (by design —
 * users simply re-enter their keys).
 */

const VERSION = 'v1'
const SALT = 'waycode.user_settings.v1'
const IV_BYTES = 12

function masterKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('SETTINGS_ENCRYPTION_KEY is not configured')
  }
  return crypto.scryptSync(secret, SALT, 32)
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv)
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    data.toString('base64'),
  ].join(':')
}

export function decryptSecret(ciphertext: string): string {
  const [version, ivB64, tagB64, dataB64] = ciphertext.split(':')
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Unrecognized ciphertext format')
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    masterKey(),
    Buffer.from(ivB64, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/** True when the value looks like an encrypted secret produced by encryptSecret. */
export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(`${VERSION}:`)
}
