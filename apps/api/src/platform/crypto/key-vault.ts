import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
export const KEY_BYTES = 32

export interface SealedSecret {
  ciphertext: string
  iv: string
  keyVersion: number
  last4: string
}

function encrypt(key: Buffer, plaintext: Buffer, aad: Buffer): { iv: Buffer; body: Buffer } {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  cipher.setAAD(aad)
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return { iv, body: Buffer.concat([encrypted, cipher.getAuthTag()]) }
}

function decrypt(key: Buffer, iv: Buffer, body: Buffer, aad: Buffer): Buffer {
  const tag = body.subarray(body.length - TAG_BYTES)
  const encrypted = body.subarray(0, body.length - TAG_BYTES)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAAD(aad)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

export class KeyVault {
  private readonly keks: Map<number, Buffer>
  private readonly currentKek: Buffer

  constructor(
    keks: Map<number, Buffer>,
    private readonly currentVersion: number,
  ) {
    for (const [version, key] of keks) {
      if (key.length !== KEY_BYTES) throw new Error(`KEK v${version} must be ${KEY_BYTES} bytes`)
    }
    const currentKek = keks.get(currentVersion)
    if (!currentKek) throw new Error(`Current KEK version ${currentVersion} missing`)
    this.keks = keks
    this.currentKek = currentKek
  }

  static fromEnv(kekBase64: string, version: number): KeyVault {
    return new KeyVault(new Map([[version, Buffer.from(kekBase64, 'base64')]]), version)
  }

  seal(plaintext: string, aad: string): SealedSecret {
    const aadBuf = Buffer.from(aad, 'utf8')
    const dek = randomBytes(KEY_BYTES)

    const encryptedSecret = encrypt(dek, Buffer.from(plaintext, 'utf8'), aadBuf)
    const wrappedDek = encrypt(this.currentKek, dek, aadBuf)
    dek.fill(0)

    return {
      ciphertext: `${Buffer.concat([wrappedDek.iv, wrappedDek.body]).toString('base64')}.${encryptedSecret.body.toString('base64')}`,
      iv: encryptedSecret.iv.toString('base64'),
      keyVersion: this.currentVersion,
      last4: plaintext.slice(-4),
    }
  }

  open(sealed: Pick<SealedSecret, 'ciphertext' | 'iv' | 'keyVersion'>, aad: string): string {
    const kek = this.keks.get(sealed.keyVersion)
    if (!kek) throw new Error(`Unknown KEK version ${sealed.keyVersion}`)
    const aadBuf = Buffer.from(aad, 'utf8')

    const [wrappedDekB64, bodyB64] = sealed.ciphertext.split('.')
    if (!wrappedDekB64 || !bodyB64) throw new Error('Malformed ciphertext')
    const wrappedDek = Buffer.from(wrappedDekB64, 'base64')
    const dek = decrypt(
      kek,
      wrappedDek.subarray(0, IV_BYTES),
      wrappedDek.subarray(IV_BYTES),
      aadBuf,
    )
    try {
      return decrypt(
        dek,
        Buffer.from(sealed.iv, 'base64'),
        Buffer.from(bodyB64, 'base64'),
        aadBuf,
      ).toString('utf8')
    } finally {
      dek.fill(0)
    }
  }
}

export const keyAad = (userId: string, provider: string) => `provider_key:${userId}:${provider}`
