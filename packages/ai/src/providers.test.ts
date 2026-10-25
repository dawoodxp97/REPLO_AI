import { describe, expect, it, vi } from 'vitest'
import { createKeyChecker, keyCheckRequest } from './providers'

const respond = (status: number) => vi.fn(async () => new Response('{}', { status }))

describe('keyCheckRequest', () => {
  it('uses a fixed endpoint per provider and never an endpoint from the user', () => {
    expect(keyCheckRequest('openai', 'k').url).toBe('https://api.openai.com/v1/models')
    expect(keyCheckRequest('anthropic', 'k').url).toBe('https://api.anthropic.com/v1/models')
    expect(keyCheckRequest('google', 'k').url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models',
    )
    expect(keyCheckRequest('openrouter', 'k').url).toBe('https://openrouter.ai/api/v1/auth/key')
  })

  it('sends the key only in a header, never in the URL', () => {
    for (const provider of ['openrouter', 'anthropic', 'openai', 'google'] as const) {
      const request = keyCheckRequest(provider, 'sk-test-abcdef123456')
      expect(request.url).not.toContain('sk-test')
      expect(JSON.stringify(request.headers)).toContain('sk-test-abcdef123456')
    }
  })
})

describe('createKeyChecker', () => {
  it('reports valid on 200', async () => {
    expect(await createKeyChecker(respond(200)).check('openai', 'k')).toBe('valid')
  })

  it('reports invalid on 401 and 403', async () => {
    expect(await createKeyChecker(respond(401)).check('openai', 'k')).toBe('invalid')
    expect(await createKeyChecker(respond(403)).check('google', 'k')).toBe('invalid')
  })

  it('reports unavailable on rate limits, server errors and network failures', async () => {
    expect(await createKeyChecker(respond(429)).check('openai', 'k')).toBe('unavailable')
    expect(await createKeyChecker(respond(503)).check('openai', 'k')).toBe('unavailable')
    const broken = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    expect(await createKeyChecker(broken).check('openai', 'k')).toBe('unavailable')
  })

  it('refuses redirects so the key cannot be sent to another host', async () => {
    const seen: RequestInit[] = []
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      seen.push(init ?? {})
      return new Response('{}', { status: 200 })
    }
    await createKeyChecker(fetchImpl).check('openai', 'k')
    expect(seen[0]).toMatchObject({ redirect: 'error' })
  })
})
