import { describe, expect, it } from 'vitest'
import { parseCookies, serializeCookie } from './cookies'

describe('serializeCookie', () => {
  it('writes an httpOnly, SameSite=Lax cookie with the attributes that were asked for', () => {
    const header = serializeCookie('replo_session', 'abc_-123', {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      domain: '.replo.test',
      maxAgeSeconds: 60,
    })
    expect(header).toBe(
      'replo_session=abc_-123; Path=/; Max-Age=60; Domain=.replo.test; SameSite=Lax; HttpOnly; Secure',
    )
  })

  it('omits Secure, Domain and Max-Age when they are not set', () => {
    const header = serializeCookie('x', 'y', {
      httpOnly: false,
      secure: false,
      sameSite: 'Strict',
      path: '/auth',
    })
    expect(header).toBe('x=y; Path=/auth; SameSite=Strict')
  })

  it('clears a cookie with Max-Age=0', () => {
    expect(
      serializeCookie('replo_session', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        path: '/',
        maxAgeSeconds: 0,
      }),
    ).toBe('replo_session=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly')
  })
})

describe('parseCookies', () => {
  it('reads every cookie in a request header and decodes values', () => {
    const cookies = parseCookies('a=1; replo_session=tok%3Dx;  b = two ')
    expect(cookies.get('a')).toBe('1')
    expect(cookies.get('replo_session')).toBe('tok=x')
    expect(cookies.get('b')).toBe('two')
  })

  it('keeps the first value when a name is repeated', () => {
    expect(parseCookies('s=first; s=second').get('s')).toBe('first')
  })

  it('skips pairs without a name or a value separator and malformed encodings', () => {
    const cookies = parseCookies('=orphan; loose; bad=%E0%A4%A; ok=yes')
    expect(cookies.has('')).toBe(false)
    expect(cookies.has('loose')).toBe(false)
    expect(cookies.has('bad')).toBe(false)
    expect(cookies.get('ok')).toBe('yes')
  })

  it('returns an empty map when there is no header', () => {
    expect(parseCookies(undefined).size).toBe(0)
  })
})
