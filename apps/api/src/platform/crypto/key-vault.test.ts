import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { KeyVault, keyAad } from './key-vault'

const kek = () => randomBytes(32)
const SECRET = 'sk-ant-api03-this-is-a-fake-test-key-1234'
const aad = keyAad('user_1', 'anthropic')

describe('KeyVault', () => {
  it('round-trips a secret', () => {
    const vault = new KeyVault(new Map([[1, kek()]]), 1)
    const sealed = vault.seal(SECRET, aad)
    expect(vault.open(sealed, aad)).toBe(SECRET)
  })

  it('never stores plaintext and exposes only last4', () => {
    const vault = new KeyVault(new Map([[1, kek()]]), 1)
    const sealed = vault.seal(SECRET, aad)
    expect(JSON.stringify(sealed)).not.toContain(SECRET)
    expect(sealed.last4).toBe('1234')
    expect(sealed.keyVersion).toBe(1)
  })

  it('uses fresh randomness per seal', () => {
    const vault = new KeyVault(new Map([[1, kek()]]), 1)
    const a = vault.seal(SECRET, aad)
    const b = vault.seal(SECRET, aad)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('rejects a different owner (AAD binds ciphertext to user + provider)', () => {
    const vault = new KeyVault(new Map([[1, kek()]]), 1)
    const sealed = vault.seal(SECRET, aad)
    expect(() => vault.open(sealed, keyAad('user_2', 'anthropic'))).toThrow()
    expect(() => vault.open(sealed, keyAad('user_1', 'openai'))).toThrow()
  })

  it('rejects the wrong KEK', () => {
    const sealed = new KeyVault(new Map([[1, kek()]]), 1).seal(SECRET, aad)
    expect(() => new KeyVault(new Map([[1, kek()]]), 1).open(sealed, aad)).toThrow()
  })

  it('detects tampering', () => {
    const vault = new KeyVault(new Map([[1, kek()]]), 1)
    const sealed = vault.seal(SECRET, aad)
    const [wrapped, body] = sealed.ciphertext.split('.') as [string, string]
    const flipped = Buffer.from(body, 'base64')
    flipped[0] = (flipped[0] ?? 0) ^ 0xff
    expect(() =>
      vault.open({ ...sealed, ciphertext: `${wrapped}.${flipped.toString('base64')}` }, aad),
    ).toThrow()
  })

  it('opens old rows after KEK rotation while sealing with the new version', () => {
    const k1 = kek()
    const k2 = kek()
    const old = new KeyVault(new Map([[1, k1]]), 1).seal(SECRET, aad)
    const rotated = new KeyVault(
      new Map([
        [1, k1],
        [2, k2],
      ]),
      2,
    )
    expect(rotated.open(old, aad)).toBe(SECRET)
    expect(rotated.seal(SECRET, aad).keyVersion).toBe(2)
  })

  it('rejects KEKs that are not 32 bytes', () => {
    expect(() => new KeyVault(new Map([[1, randomBytes(16)]]), 1)).toThrow()
  })
})
