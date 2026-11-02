import type { FastifyRequest } from 'fastify'
import { describe, expect, it } from 'vitest'
import { router } from '../router'
import { buildRateRules, RATE_LIMITED_PATHS } from './rate-limit-rules'

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

  it('only names procedures that exist on the router', () => {
    const lookup = (path: string): unknown =>
      path
        .replace('/rpc/', '')
        .split('/')
        .reduce<unknown>(
          (node, key) =>
            typeof node === 'object' && node !== null ? Reflect.get(node, key) : undefined,
          router,
        )
    for (const path of Object.values(RATE_LIMITED_PATHS).flat())
      expect(lookup(path), path).toBeDefined()
  })

  it('limits the github-backed and destructive procedures per user', async () => {
    for (const path of RATE_LIMITED_PATHS.gated) {
      expect(await ruleFor(path, 'u1').key(request('1.2.3.4'))).toBe('user:u1')
    }
  })

  it('leaves other paths unlimited', () => {
    expect(buildRateRules({ userIdOf: async () => null }).some((r) => r.matches('/rpc/me'))).toBe(
      false,
    )
  })
})
