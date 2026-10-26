import { describe, expect, it } from 'vitest'
import { createSessionCookie, hashSessionToken, newSessionToken } from './session'

describe('session tokens', () => {
  it('issues a 256-bit url-safe token, different every time', () => {
    const token = newSessionToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(newSessionToken()).not.toBe(token)
  })

  it('hashes a token deterministically and never keeps the token itself', () => {
    const token = newSessionToken()
    expect(hashSessionToken(token)).toBe(hashSessionToken(token))
    expect(hashSessionToken(token)).not.toContain(token)
    expect(hashSessionToken('other')).not.toBe(hashSessionToken(token))
  })
})

describe('createSessionCookie', () => {
  it('issues an httpOnly, SameSite=Lax cookie that lasts thirty days', () => {
    expect(createSessionCookie({ secure: true, domain: undefined }).issue('abc')).toBe(
      'replo_session=abc; Path=/; Max-Age=2592000; SameSite=Lax; HttpOnly; Secure',
    )
  })

  it('clears the cookie and shares it across subdomains when a domain is configured', () => {
    const cookie = createSessionCookie({ secure: false, domain: '.replo.test' })
    expect(cookie.clear()).toBe(
      'replo_session=; Path=/; Max-Age=0; Domain=.replo.test; SameSite=Lax; HttpOnly',
    )
    expect(cookie.issue('abc')).toContain('Domain=.replo.test')
  })
})
