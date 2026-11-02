import type { FastifyRequest } from 'fastify'
import type { RateRule } from './http-guards'
import { FixedWindowLimiter } from './rate-limit'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

export const RATE_LIMITED_PATHS = {
  expensive: ['/rpc/repositories/import', '/rpc/jobs/retry'],
  keysAdd: ['/rpc/keys/add'],
  keysValidate: ['/rpc/keys/validate'],
  gated: [
    '/rpc/repositories/preflight',
    '/rpc/repositories/estimate',
    '/rpc/github/listRepos',
    '/rpc/search/own',
    '/rpc/me/deleteAccount',
    '/rpc/auth/revokeOtherSessions',
  ],
  credentials: ['/rpc/auth/signIn', '/rpc/auth/signUp'],
} as const

type KeyOf = RateRule['key']

export interface RateRuleDeps {
  userIdOf(request: FastifyRequest): Promise<string | null>
}

function limitedPaths(
  paths: readonly string[],
  max: number,
  windowMs: number,
  key: KeyOf,
): RateRule {
  const accepted = new Set(paths)
  return {
    matches: (path) => accepted.has(path),
    limiter: new FixedWindowLimiter(max, windowMs),
    key,
  }
}

export function buildRateRules(deps: RateRuleDeps): RateRule[] {
  const byIp: KeyOf = async (request) => `ip:${request.ip}`
  const byUserOrIp: KeyOf = async (request) => {
    const userId = await deps.userIdOf(request)
    return userId ? `user:${userId}` : `ip:${request.ip}`
  }
  return [
    limitedPaths(RATE_LIMITED_PATHS.expensive, 20, HOUR_MS, byUserOrIp),
    limitedPaths(RATE_LIMITED_PATHS.keysAdd, 30, HOUR_MS, byUserOrIp),
    limitedPaths(RATE_LIMITED_PATHS.keysValidate, 60, HOUR_MS, byUserOrIp),
    limitedPaths(RATE_LIMITED_PATHS.gated, 120, MINUTE_MS, byUserOrIp),
    limitedPaths(RATE_LIMITED_PATHS.credentials, 20, MINUTE_MS, byIp),
  ]
}
