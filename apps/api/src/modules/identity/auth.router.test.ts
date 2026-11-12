import { createRouterClient } from '@orpc/server'
import { describe, expect, it, vi } from 'vitest'
import type { RequestContext } from '../../request-context'
import { authRouter } from './auth.router'

function refusedAuthClient() {
  const setSessionToken = vi.fn()
  const client = createRouterClient(authRouter, {
    context: {
      user: null,
      sessionId: null,
      setSessionToken,
      services: {
        auth: {
          enabledProviders: () => ({ google: false, github: false }),
          signIn: async () => ({ kind: 'refused', refusal: 'INVALID_CREDENTIALS' }),
          signUp: async () => ({ kind: 'refused', refusal: 'EMAIL_TAKEN' }),
        },
      } as unknown as RequestContext['services'],
      idempotencyKey: undefined,
      requestId: 'auth-router-test',
    },
  })
  return { client, setSessionToken }
}

describe('authentication refusals', () => {
  it('returns 401 for invalid credentials without issuing a session', async () => {
    const { client, setSessionToken } = refusedAuthClient()
    await expect(
      client.signIn({ email: 'ada@example.com', password: 'wrong password' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 })
    expect(setSessionToken).not.toHaveBeenCalled()
  })

  it('returns 409 for an existing email without issuing a session', async () => {
    const { client, setSessionToken } = refusedAuthClient()
    await expect(
      client.signUp({ name: 'Ada', email: 'ada@example.com', password: 'correct horse' }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 })
    expect(setSessionToken).not.toHaveBeenCalled()
  })

  it('reports unconfigured providers without requiring a session', async () => {
    const { client } = refusedAuthClient()
    expect(await client.providers()).toEqual({ google: false, github: false })
  })
})
