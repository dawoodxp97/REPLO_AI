import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyGithubSignature } from './webhook'

const secret = 'whsec_test_secret'
const body = JSON.stringify({ action: 'created', installation: { id: 1 } })
const sign = (s: string, b: string) => `sha256=${createHmac('sha256', s).update(b).digest('hex')}`

describe('verifyGithubSignature', () => {
  it('accepts a correct signature over the raw body', () => {
    expect(verifyGithubSignature(secret, body, sign(secret, body))).toBe(true)
    expect(verifyGithubSignature(secret, Buffer.from(body), sign(secret, body))).toBe(true)
  })

  it('rejects a forged signature (wrong secret)', () => {
    expect(verifyGithubSignature(secret, body, sign('attacker', body))).toBe(false)
  })

  it('rejects a modified body', () => {
    expect(verifyGithubSignature(secret, `${body} `, sign(secret, body))).toBe(false)
  })

  it('rejects a valid digest followed by trailing characters', () => {
    expect(verifyGithubSignature(secret, body, `${sign(secret, body)}zz`)).toBe(false)
  })

  it('rejects missing, malformed or wrong-length headers', () => {
    expect(verifyGithubSignature(secret, body, undefined)).toBe(false)
    expect(verifyGithubSignature(secret, body, 'sha1=abc')).toBe(false)
    expect(verifyGithubSignature(secret, body, 'sha256=')).toBe(false)
    expect(verifyGithubSignature(secret, body, 'sha256=zzzz')).toBe(false)
    expect(verifyGithubSignature(secret, body, 'sha256=abcd')).toBe(false)
  })
})
