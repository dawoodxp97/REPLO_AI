import { FixedWindowLimiter } from './rate-limit'
import { describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import {
  defaultTrustProxy,
  isValidTrustProxy,
  parseTrustProxy,
  toFastifyTrustProxy,
} from './trust-proxy'

describe('trust proxy', () => {
  it('parses hop counts, disabled values and CIDR lists', () => {
    expect(parseTrustProxy('1')).toBe(1)
    expect(parseTrustProxy('2')).toBe(2)
    expect(parseTrustProxy('0')).toBe(false)
    expect(parseTrustProxy('false')).toBe(false)
    expect(parseTrustProxy('10.0.0.0/8, 127.0.0.1,loopback')).toEqual([
      '10.0.0.0/8',
      '127.0.0.1',
      'loopback',
    ])
  })

  it('rejects true, empty lists and malformed addresses', () => {
    for (const value of ['true', ',', '10.0.0.0/33', 'nope', '1.2.3.4/x', '::1/129', '1.2.3/8'])
      expect(isValidTrustProxy(value)).toBe(false)
    for (const value of ['1', 'false', '::1', 'fd00::/8', '10.0.0.0/8,loopback'])
      expect(isValidTrustProxy(value)).toBe(true)
  })

  it('trusts no proxy outside production and one hop in production', () => {
    expect(defaultTrustProxy('development')).toBe(false)
    expect(defaultTrustProxy('test')).toBe(false)
    expect(defaultTrustProxy('production')).toBe(1)
  })

  it('resolves request.ip from the entry the last trusted hop appended', async () => {
    const ipFor = async (trustProxy: Parameters<typeof toFastifyTrustProxy>[0]) => {
      const app = Fastify({ trustProxy: toFastifyTrustProxy(trustProxy) })
      app.get('/ip', async (request) => request.ip)
      const response = await app.inject({
        method: 'GET',
        url: '/ip',
        remoteAddress: '10.0.0.5',
        headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' },
      })
      return response.body
    }
    expect(await ipFor(1)).toBe('203.0.113.9')
    expect(await ipFor(false)).toBe('10.0.0.5')
    expect(await ipFor(['10.0.0.0/8'])).toBe('203.0.113.9')
  })

  it('does not let a forged leftmost X-Forwarded-For mint a fresh sign-in bucket', async () => {
    const app = Fastify({ trustProxy: toFastifyTrustProxy(1) })
    const limiter = new FixedWindowLimiter(20, 60_000)
    app.post('/rpc/auth/signIn', async (request, reply) => {
      const decision = limiter.take(`ip:${request.ip}`)
      return decision.allowed ? { ok: true } : reply.code(429).send({ error: 'RATE_LIMITED' })
    })
    const statuses: number[] = []
    for (let i = 0; i < 21; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/rpc/auth/signIn',
        remoteAddress: '10.0.0.5',
        headers: { 'x-forwarded-for': `1.2.3.${i}, 203.0.113.9` },
      })
      statuses.push(response.statusCode)
    }
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true)
    expect(statuses[20]).toBe(429)
  })
})
