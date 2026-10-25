import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import type { App } from './http'
import { registerGuards } from './http-guards'
import { FixedWindowLimiter } from './rate-limit'
import { requestIdFrom } from './request-id'

const ORIGIN = 'https://replo.test'

function buildApp(rules: Parameters<typeof registerGuards>[1]['rules'] = []) {
  const app = Fastify({
    genReqId: (req) => requestIdFrom(req.headers['x-request-id']),
  }) as unknown as App
  registerGuards(app, { productOrigin: ORIGIN, exemptFromOrigin: ['/webhooks/github'], rules })
  app.post('/rpc/things', async () => ({ ok: true }))
  app.post('/webhooks/github', async () => ({ ok: true }))
  app.get('/rpc/things', async () => ({ ok: true }))
  app.post('/rpc/fail', async (_request, reply) => reply.code(400).send({ code: 'BAD_REQUEST' }))
  return app
}

describe('registerGuards', () => {
  it('refuses state-changing requests from another origin', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/rpc/things',
      headers: { origin: 'https://evil.test' },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ error: 'BAD_ORIGIN' })
  })

  it('accepts the product origin and requests without an origin header', async () => {
    const app = buildApp()
    expect(
      (await app.inject({ method: 'POST', url: '/rpc/things', headers: { origin: ORIGIN } }))
        .statusCode,
    ).toBe(200)
    expect((await app.inject({ method: 'POST', url: '/rpc/things' })).statusCode).toBe(200)
  })

  it('does not check origins on reads or on exempt server-to-server paths', async () => {
    const app = buildApp()
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/rpc/things',
          headers: { origin: 'https://evil.test' },
        })
      ).statusCode,
    ).toBe(200)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/webhooks/github',
          headers: { origin: 'https://evil.test' },
        })
      ).statusCode,
    ).toBe(200)
  })

  it('echoes a usable client request id and generates one otherwise', async () => {
    const app = buildApp()
    const echoed = await app.inject({
      method: 'GET',
      url: '/rpc/things',
      headers: { 'x-request-id': 'client-req-000001' },
    })
    expect(echoed.headers['x-request-id']).toBe('client-req-000001')

    const generated = await app.inject({
      method: 'GET',
      url: '/rpc/things',
      headers: { 'x-request-id': 'bad id with spaces' },
    })
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('adds the request id to JSON error bodies', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/rpc/fail',
      headers: { 'x-request-id': 'client-req-000002', 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ code: 'BAD_REQUEST', requestId: 'client-req-000002' })
  })

  it('answers 429 with Retry-After once a rule is exhausted', async () => {
    const limiter = new FixedWindowLimiter(1, 60_000)
    const app = buildApp([
      {
        matches: (path) => path === '/rpc/things',
        limiter,
        key: async () => 'user:limited',
      },
    ])
    const first = await app.inject({
      method: 'POST',
      url: '/rpc/things',
      headers: { origin: ORIGIN },
    })
    expect(first.statusCode).toBe(200)

    const second = await app.inject({
      method: 'POST',
      url: '/rpc/things',
      headers: { origin: ORIGIN },
    })
    expect(second.statusCode).toBe(429)
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(0)
    expect(second.json()).toMatchObject({ error: 'RATE_LIMITED' })
  })
})
