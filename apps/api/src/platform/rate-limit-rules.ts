import type { FastifyRequest } from 'fastify'
import type { RateRule } from './http-guards'
import { FixedWindowLimiter } from './rate-limit'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

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
    limitedPaths(['/rpc/repositories/import'], 20, HOUR_MS, byUserOrIp),
    limitedPaths(['/rpc/keys/add'], 30, HOUR_MS, byUserOrIp),
    limitedPaths(['/rpc/keys/validate'], 60, HOUR_MS, byUserOrIp),
    limitedPaths(['/rpc/auth/signIn', '/rpc/auth/signUp'], 20, MINUTE_MS, byIp),
  ]
}
