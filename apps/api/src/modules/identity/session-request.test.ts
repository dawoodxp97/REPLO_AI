import type { FastifyRequest } from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import type { AuthService, CurrentSession } from './auth.service'
import { sessionFromRequest } from './session-request'

const requestWith = (cookie?: string) =>
  ({ headers: cookie === undefined ? {} : { cookie } }) as unknown as FastifyRequest

const signedInAs = (userId: string): CurrentSession => ({
  sessionId: `session-of-${userId}`,
  user: { id: userId, name: 'Ada', email: 'ada@example.com', image: null },
})

describe('sessionFromRequest', () => {
  it('looks the session up once per request', async () => {
    const currentSession = vi.fn(async () => signedInAs('user-1'))
    const auth = { currentSession } as unknown as Pick<AuthService, 'currentSession'>
    const request = requestWith('replo_session=token-a')

    const first = await sessionFromRequest(auth, request)
    const second = await sessionFromRequest(auth, request)

    expect(second).toBe(first)
    expect(currentSession).toHaveBeenCalledTimes(1)
  })

  it('reads the session token from the replo_session cookie only', async () => {
    const currentSession = vi.fn(async () => null)
    const auth = { currentSession } as unknown as Pick<AuthService, 'currentSession'>

    await sessionFromRequest(auth, requestWith('other=1; replo_session=token-b'))
    await sessionFromRequest(auth, requestWith('other=1'))
    await sessionFromRequest(auth, requestWith(undefined))

    expect(currentSession.mock.calls).toEqual([['token-b'], [undefined], [undefined]])
  })
})
