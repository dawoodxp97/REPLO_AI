import type { FastifyReply, FastifyRequest } from 'fastify'
import type { RequestContext, Services } from './context'
import type { SessionCookie } from './modules/identity/session'
import { sessionFromRequest } from './modules/identity/session-request'

export interface RequestContextDeps {
  services: Services
  sessionCookie: Pick<SessionCookie, 'issue' | 'clear'>
}

export async function buildRequestContext(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: RequestContextDeps,
): Promise<RequestContext> {
  const session = await sessionFromRequest(deps.services.auth, request)
  const idempotencyKey = request.headers['idempotency-key']
  return {
    user: session?.user ?? null,
    sessionId: session?.sessionId ?? null,
    setSessionToken: (token) =>
      reply.header(
        'set-cookie',
        token === null ? deps.sessionCookie.clear() : deps.sessionCookie.issue(token),
      ),
    services: deps.services,
    idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
    requestId: request.id,
  }
}
