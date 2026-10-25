import type { FastifyReply, FastifyRequest } from 'fastify'
import type { App } from './http'
import type { FixedWindowLimiter } from './rate-limit'

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

interface RateRule {
  matches(path: string): boolean
  limiter: FixedWindowLimiter
  key(request: FastifyRequest): Promise<string>
}

interface GuardOptions {
  productOrigin: string
  exemptFromOrigin: readonly string[]
  rules: readonly RateRule[]
}

export function registerGuards(app: App, options: GuardOptions): void {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id)

    if (STATE_CHANGING.has(request.method)) {
      const origin = request.headers.origin
      const exempt = options.exemptFromOrigin.some((path) => request.url.startsWith(path))
      if (!exempt && origin !== undefined && origin !== options.productOrigin)
        return refuse(reply, 403, 'BAD_ORIGIN')
    }

    const path = request.url.split('?')[0] ?? ''
    for (const rule of options.rules) {
      if (!rule.matches(path)) continue
      const decision = rule.limiter.take(await rule.key(request))
      if (!decision.allowed) {
        reply.header('retry-after', String(decision.retryAfterSeconds))
        return refuse(reply, 429, 'RATE_LIMITED')
      }
    }
  })

  app.addHook('onSend', async (request, reply, payload) => {
    if (reply.statusCode < 400 || typeof payload !== 'string') return payload
    if (!String(reply.getHeader('content-type') ?? '').includes('application/json')) return payload
    try {
      const body = JSON.parse(payload) as Record<string, unknown>
      return JSON.stringify({ ...body, requestId: request.id })
    } catch {
      return payload
    }
  })
}

function refuse(reply: FastifyReply, status: number, error: string) {
  return reply.code(status).type('application/json').send({ error })
}
