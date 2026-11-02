import type { FastifyRequest } from 'fastify'
import { describe, expect, it } from 'vitest'
import { buildRateRules } from './rate-limit-rules'

const request = (ip: string) => ({ ip }) as FastifyRequest

function ruleFor(path: string, userId: string | null = null) {
  const rule = buildRateRules({ userIdOf: async () => userId }).find((r) => r.matches(path))
  if (!rule) throw new Error(`no rule for ${path}`)
  return rule
}

describe('buildRateRules', () => {
  it('limits sign-in and sign-up per ip, sharing one budget', async () => {
    const rule = ruleFor('/rpc/auth/signIn')
    expect(ruleFor('/rpc/auth/signUp').matches('/rpc/auth/signUp')).toBe(true)
    expect(await rule.key(request('1.2.3.4'))).toBe('ip:1.2.3.4')
    for (let i = 0; i < 20; i++) expect(rule.limiter.take('ip:1.2.3.4')).toEqual({ allowed: true })
    expect(rule.limiter.take('ip:1.2.3.4').allowed).toBe(false)
  })

  it('keys import, key-add and key-validate by user and falls back to ip', async () => {
    for (const path of ['/rpc/repositories/import', '/rpc/keys/add', '/rpc/keys/validate']) {
      expect(await ruleFor(path, 'u1').key(request('1.2.3.4'))).toBe('user:u1')
      expect(await ruleFor(path).key(request('1.2.3.4'))).toBe('ip:1.2.3.4')
    }
  })

  it('leaves other paths unlimited', () => {
    expect(buildRateRules({ userIdOf: async () => null }).some((r) => r.matches('/rpc/me'))).toBe(
      false,
    )
  })
})
