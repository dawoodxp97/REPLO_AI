import type { FastifyReply, FastifyRequest } from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import type { Services } from './request-context'
import { buildRequestContext } from './request-context'

const SESSION = { user: { id: 'u1', name: null, email: null, image: null }, sessionId: 's1' }

function setup(headers: Record<string, string | string[]> = {}) {
  const currentSession = vi.fn(async () => SESSION)
  const header = vi.fn()
  const services = { auth: { currentSession } } as unknown as Services
  const request = {
    headers: { cookie: 'a=b', ...headers },
    id: 'req-1',
  } as unknown as FastifyRequest
  const reply = { header } as unknown as FastifyReply
  const sessionCookie = { issue: (token: string) => `issued:${token}`, clear: () => 'cleared' }
  return { currentSession, header, services, request, reply, sessionCookie }
}

describe('buildRequestContext', () => {
  it('exposes the session, request id and string idempotency key', async () => {
    const { services, request, reply, sessionCookie } = setup({ 'idempotency-key': 'k1' })
    const context = await buildRequestContext(request, reply, { services, sessionCookie })
    expect(context).toMatchObject({
      user: SESSION.user,
      sessionId: 's1',
      idempotencyKey: 'k1',
      requestId: 'req-1',
      services,
    })
  })

  it('drops non-string idempotency headers', async () => {
    const { services, request, reply, sessionCookie } = setup({ 'idempotency-key': ['a', 'b'] })
    const context = await buildRequestContext(request, reply, { services, sessionCookie })
    expect(context.idempotencyKey).toBeUndefined()
  })

  it('sets and clears the session cookie through the reply', async () => {
    const { services, request, reply, sessionCookie, header } = setup()
    const context = await buildRequestContext(request, reply, { services, sessionCookie })
    context.setSessionToken('tok')
    context.setSessionToken(null)
    expect(header).toHaveBeenNthCalledWith(1, 'set-cookie', 'issued:tok')
    expect(header).toHaveBeenNthCalledWith(2, 'set-cookie', 'cleared')
  })

  it('shares one session lookup per request', async () => {
    const { services, request, reply, sessionCookie, currentSession } = setup()
    await buildRequestContext(request, reply, { services, sessionCookie })
    await buildRequestContext(request, reply, { services, sessionCookie })
    expect(currentSession).toHaveBeenCalledTimes(1)
  })
})
