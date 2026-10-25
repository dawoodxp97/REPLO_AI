import { createVerify, generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createAppJwt } from './app-jwt'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()
const now = 1_790_000_000

describe('createAppJwt', () => {
  it('signs RS256 over header.payload with the App private key', () => {
    const [header, payload, signature] = createAppJwt('12345', pem, now).split('.')
    const verified = createVerify('RSA-SHA256')
      .update(`${header}.${payload}`)
      .verify(publicKey, signature ?? '', 'base64url')
    expect(verified).toBe(true)
  })

  it('carries the App id as issuer and a short validity window', () => {
    const [, payload] = createAppJwt('12345', pem, now).split('.')
    const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString())
    expect(claims).toEqual({ iat: now - 60, exp: now + 540, iss: '12345' })
  })

  it('accepts a private key whose newlines were stored escaped', () => {
    const escaped = pem.replace(/\n/g, '\\n')
    const [header, payload, signature] = createAppJwt('12345', escaped, now).split('.')
    expect(
      createVerify('RSA-SHA256')
        .update(`${header}.${payload}`)
        .verify(publicKey, signature ?? '', 'base64url'),
    ).toBe(true)
  })
})
