import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { RPCHandler } from '@orpc/server/fastify'
import Fastify, { type FastifyRequest } from 'fastify'
import PgBoss from 'pg-boss'
import { createDomainServices, createServices } from './composition'
import type { RequestContext } from './context'
import { registerJobEventsRoute } from './modules/generation/job-events.route'
import { createGithubWebhookService } from './modules/github/github.webhook.service'
import { registerGithubWebhook } from './modules/github/github.webhook.route'
import { registerGithubSetup } from './modules/github/github.setup.route'
import { registerAuthRoutes } from './modules/identity/auth.route'
import { createOAuthClients } from './modules/identity/oauth'
import { sessionFromRequest } from './modules/identity/session-request'
import { createSessionCookie } from './modules/identity/session'
import { declareQueues } from './jobs/queues'
import { registerNotificationsStream } from './modules/notifications/notifications.stream.route'
import { loadConfig } from './platform/config'
import { createDb } from './platform/db/client'
import { registerGuards } from './platform/http-guards'
import { createLogger } from './platform/logger'
import { FixedWindowLimiter } from './platform/rate-limit'
import { requestIdFrom } from './platform/request-id'
import { pgBossQueue } from './platform/queue/job-queue'
import { router } from './router'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const BODY_LIMIT_BYTES = 1_048_576
const GLOBAL_REQUESTS_PER_MINUTE = 300
const IMPORT_REQUESTS_PER_HOUR = 20
const KEY_ADD_REQUESTS_PER_HOUR = 30
const KEY_VALIDATE_REQUESTS_PER_HOUR = 60
const SIGN_IN_REQUESTS_PER_MINUTE = 20

const config = loadConfig()
const log = createLogger({
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV === 'development',
  name: 'api',
})
const { db, pool } = createDb(config.DATABASE_URL)

const boss = new PgBoss({
  connectionString: config.DATABASE_URL,
  supervise: false,
  schedule: false,
})
boss.on('error', (err) => log.error({ err }, 'pg-boss error'))
await boss.start()
await declareQueues(boss)

const oauth = createOAuthClients(config)
const domain = createDomainServices({ config, db, queue: pgBossQueue(boss) })
const services = createServices({ config, db, domain, oauth })
const githubWebhooks = createGithubWebhookService({ db, sink: domain.repositoryChanges })
const secureCookies = config.NODE_ENV === 'production'
const sessionCookie = createSessionCookie({
  secure: secureCookies,
  domain: config.AUTH_COOKIE_DOMAIN,
})

const app = Fastify({
  loggerInstance: log,
  trustProxy: true,
  bodyLimit: BODY_LIMIT_BYTES,
  genReqId: (request) => requestIdFrom(request.headers['x-request-id']),
})

await app.register(helmet)
await app.register(cors, { origin: config.PRODUCT_ORIGIN, credentials: true })
await app.register(rateLimit, { max: GLOBAL_REQUESTS_PER_MINUTE, timeWindow: '1 minute' })

const limitByUserOrIp = async (request: FastifyRequest) => {
  const session = await sessionFromRequest(services.auth, request)
  return session ? `user:${session.user.id}` : `ip:${request.ip}`
}
const limitByIp = async (request: FastifyRequest) => `ip:${request.ip}`

registerGuards(app, {
  productOrigin: config.PRODUCT_ORIGIN,
  exemptFromOrigin: ['/webhooks/github'],
  rules: [
    {
      matches: (path) => path === '/rpc/repositories/import',
      limiter: new FixedWindowLimiter(IMPORT_REQUESTS_PER_HOUR, HOUR_MS),
      key: limitByUserOrIp,
    },
    {
      matches: (path) => path === '/rpc/keys/add',
      limiter: new FixedWindowLimiter(KEY_ADD_REQUESTS_PER_HOUR, HOUR_MS),
      key: limitByUserOrIp,
    },
    {
      matches: (path) => path === '/rpc/keys/validate',
      limiter: new FixedWindowLimiter(KEY_VALIDATE_REQUESTS_PER_HOUR, HOUR_MS),
      key: limitByUserOrIp,
    },
    {
      matches: (path) => path === '/rpc/auth/signIn' || path === '/rpc/auth/signUp',
      limiter: new FixedWindowLimiter(SIGN_IN_REQUESTS_PER_MINUTE, MINUTE_MS),
      key: limitByIp,
    },
  ],
})

app.get('/healthz', async () => ({ ok: true }))
app.get('/readyz', async (_req, reply) => {
  try {
    await pool.query('select 1')
    return { ok: true }
  } catch {
    return reply.code(503).send({ ok: false })
  }
})

registerAuthRoutes(app, {
  auth: services.auth,
  clients: oauth,
  sessionCookie,
  productOrigin: config.PRODUCT_ORIGIN,
  apiPublicUrl: config.API_PUBLIC_URL,
  secure: secureCookies,
})
registerGithubWebhook(app, { secret: config.GITHUB_WEBHOOK_SECRET, webhooks: githubWebhooks, log })
registerGithubSetup(app, {
  auth: services.auth,
  identity: services.identity,
  github: services.github,
  productOrigin: config.PRODUCT_ORIGIN,
})
registerJobEventsRoute(app, { db, auth: services.auth, productOrigin: config.PRODUCT_ORIGIN })
registerNotificationsStream(app, {
  auth: services.auth,
  notifications: services.notifications,
  productOrigin: config.PRODUCT_ORIGIN,
})

await app.register(async (scope) => {
  scope.addContentTypeParser('*', (_req, _payload, done) => done(null, undefined))
  const handler = new RPCHandler(router)

  scope.all('/rpc/*', async (request, reply) => {
    const session = await sessionFromRequest(services.auth, request)
    const idempotencyKey = request.headers['idempotency-key']
    const context: RequestContext = {
      user: session?.user ?? null,
      sessionId: session?.sessionId ?? null,
      setSessionToken: (token) =>
        reply.header(
          'set-cookie',
          token === null ? sessionCookie.clear() : sessionCookie.issue(token),
        ),
      services,
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
      requestId: request.id,
    }

    const { matched } = await handler.handle(request, reply, { prefix: '/rpc', context })
    if (!matched) return reply.code(404).send({ error: 'NOT_FOUND' })
  })
})

const shutdown = async (signal: string) => {
  log.info({ signal }, 'shutting down')
  await app.close()
  await boss.stop({ graceful: true, timeout: 5_000 })
  await pool.end()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

await app.listen({ port: config.PORT, host: '0.0.0.0' })
