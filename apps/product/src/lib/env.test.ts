import { describe, expect, it } from 'vitest'
import { parsePublicEnv } from './env'

describe('parsePublicEnv', () => {
  it('falls back to local development URLs', () => {
    expect(parsePublicEnv({})).toEqual({
      apiUrl: 'http://localhost:4000',
      apiOrigin: 'http://localhost:4000',
      appUrl: 'http://localhost:3001',
    })
  })

  it('derives the API origin without its path', () => {
    const env = parsePublicEnv({
      NEXT_PUBLIC_API_URL: 'https://api.replo.dev/base',
      NEXT_PUBLIC_APP_URL: 'https://replo.dev',
    })
    expect(env.apiOrigin).toBe('https://api.replo.dev')
    expect(env.apiUrl).toBe('https://api.replo.dev/base')
  })

  it('refuses a value that is not a URL', () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_API_URL: 'not a url' })).toThrow()
  })
})
