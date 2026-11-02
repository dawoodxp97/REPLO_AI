import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Logger } from 'pino'
import type { App } from '../../platform/http'
import type { GithubWebhookService } from './github.webhook.service'
import { verifyGithubSignature } from './webhook'

const WEBHOOK_BODY_LIMIT_BYTES = 25 * 1024 * 1024
const SIGNATURE_SHAPE = /^sha256=[0-9a-f]{64}$/i

export function registerGithubWebhook(
  app: App,
  deps: { secret: string | undefined; webhooks: GithubWebhookService; log: Logger },
) {
  const rejectUnidentified = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.secret) return reply.code(503).send({ error: 'WEBHOOK_NOT_CONFIGURED' })
    const signature = request.headers['x-hub-signature-256']
    if (typeof signature !== 'string' || !SIGNATURE_SHAPE.test(signature))
      return reply.code(401).send({ error: 'INVALID_SIGNATURE' })
    if (
      typeof request.headers['x-github-delivery'] !== 'string' ||
      typeof request.headers['x-github-event'] !== 'string'
    )
      return reply.code(400).send({ error: 'MISSING_HEADERS' })
    return undefined
  }

  app.register(async (scope) => {
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer', bodyLimit: WEBHOOK_BODY_LIMIT_BYTES },
      (_req, body, done) => done(null, body),
    )

    scope.post(
      '/webhooks/github',
      {
        bodyLimit: WEBHOOK_BODY_LIMIT_BYTES,
        onRequest: rejectUnidentified,
        config: { rateLimit: { max: 300, timeWindow: '1 minute' } },
      },
      async (request, reply) => {
        if (!deps.secret) return reply.code(503).send({ error: 'WEBHOOK_NOT_CONFIGURED' })

        const raw = request.body
        if (!Buffer.isBuffer(raw)) return reply.code(400).send({ error: 'INVALID_BODY' })
        const signature = request.headers['x-hub-signature-256']
        if (
          !verifyGithubSignature(
            deps.secret,
            raw,
            typeof signature === 'string' ? signature : undefined,
          )
        ) {
          return reply.code(401).send({ error: 'INVALID_SIGNATURE' })
        }

        const deliveryId = request.headers['x-github-delivery']
        const event = request.headers['x-github-event']
        if (typeof deliveryId !== 'string' || typeof event !== 'string')
          return reply.code(400).send({ error: 'MISSING_HEADERS' })

        let payload: unknown
        try {
          payload = JSON.parse(raw.toString('utf8'))
        } catch {
          return reply.code(400).send({ error: 'INVALID_JSON' })
        }

        const outcome = await deps.webhooks.handle({ deliveryId, event, payload })
        deps.log.info({ deliveryId, event, outcome }, 'github webhook handled')
        switch (outcome) {
          case 'processed':
            return reply.code(202).send({ accepted: true })
          case 'duplicate':
            return reply.code(200).send({ duplicate: true })
          case 'ignored':
            return reply.code(202).send({ ignored: true })
          case 'skipped':
            return reply.code(200).send({ skipped: true })
          case 'invalid':
            return reply.code(400).send({ error: 'INVALID_PAYLOAD' })
        }
      },
    )
  })
}
