import type { FastifyRequest } from 'fastify'
import { parseCookies } from '../../platform/cookies'
import type { AuthService, CurrentSession } from './auth.service'
import { SESSION_COOKIE } from './session'

export const sessionTokenOf = (request: FastifyRequest): string | undefined =>
  parseCookies(request.headers.cookie).get(SESSION_COOKIE)

const lookups = new WeakMap<FastifyRequest, Promise<CurrentSession | null>>()

export function sessionFromRequest(
  auth: Pick<AuthService, 'currentSession'>,
  request: FastifyRequest,
): Promise<CurrentSession | null> {
  const cached = lookups.get(request)
  if (cached) return cached
  const lookup = auth.currentSession(sessionTokenOf(request))
  lookups.set(request, lookup)
  return lookup
}
