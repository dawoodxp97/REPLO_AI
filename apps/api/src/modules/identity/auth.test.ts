import type { FastifyRequest } from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { sessionFromRequest, type Auth } from './auth'

const requestWith = (cookie: string) => ({ headers: { cookie } }) as unknown as FastifyRequest

const authReturning = (user: { id: string }) => {
  const getSession = vi.fn(async () => ({ user }))
  return { auth: { api: { getSession } } as unknown as Auth, getSession }
}

describe('sessionFromRequest', () => {
  it('looks the session up once per request', async () => {
    const { auth, getSession } = authReturning({ id: 'user-1' })
    const request = requestWith('session=a')

    const first = await sessionFromRequest(auth, request)
    const second = await sessionFromRequest(auth, request)

    expect(second).toBe(first)
    expect(getSession).toHaveBeenCalledTimes(1)
  })

  it('looks up each request separately', async () => {
    const { auth, getSession } = authReturning({ id: 'user-1' })

    await sessionFromRequest(auth, requestWith('session=a'))
    await sessionFromRequest(auth, requestWith('session=b'))

    expect(getSession).toHaveBeenCalledTimes(2)
  })
})
