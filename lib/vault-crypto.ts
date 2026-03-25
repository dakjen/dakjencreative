import crypto from 'crypto'

function getKey(): Buffer {
  const hex = process.env.VAULT_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('VAULT_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
  return Buffer.from(hex, 'hex')
}

// Returns "ivHex:tagHex:ciphertextHex"
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc.toString('hex')
}

export function decrypt(data: string): string {
  const key = getKey()
  const [ivHex, tagHex, encHex] = data.split(':')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}
