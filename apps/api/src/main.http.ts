import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { RPCHandler } from '@orpc/server/fastify'
import Fastify from 'fastify'
import { createDomainServices, createServices, vaultFrom } from './composition'
import { registerJobEventsRoute } from './modules/generation/job-events.route'
import { createGithubWebhookService } from './modules/github/github.webhook.service'
import { registerGithubWebhook } from './modules/github/github.webhook.route'
import { registerGithubSetup } from './modules/github/github.setup.route'
import { registerAuthRoutes } from './modules/identity/auth.route'
import { createOAuthClients } from './modules/identity/oauth'
import { sessionFromRequest } from './modules/identity/session-request'
import { createSessionCookie } from './modules/identity/session'
import { registerNotificationsStream } from './modules/notifications/notifications.stream.route'
import { bootstrap } from './platform/bootstrap'
import { registerGuards } from './platform/http-guards'
import { pgBossQueue } from './platform/queue/job-queue'
import { buildRateRules } from './platform/rate-limit-rules'
import { requestIdFrom } from './platform/request-id'
import { installShutdown } from './platform/shutdown'
import { toFastifyTrustProxy } from './platform/trust-proxy'
import { buildRequestContext } from './request-context'
import { router } from './router'

const BODY_LIMIT_BYTES = 1_048_576
const GLOBAL_REQUESTS_PER_MINUTE = 300
const BOSS_STOP_TIMEOUT_MS = 5_000
const SHUTDOWN_TIMEOUT_MS = 15_000

const { config, log, db, pool, boss, releaseSteps } = await bootstrap('api', {
  supervise: false,
  schedule: false,
})

const vault = vaultFrom(config)
const oauth = createOAuthClients(config)
const domain = createDomainServices({ config, db, queue: pgBossQueue(boss), vault })
const services = createServices({ config, db, domain, oauth, vault })
const githubWebhooks = createGithubWebhookService({ db, sink: domain.repositoryChanges })
const secureCookies = config.NODE_ENV === 'production'
const sessionCookie = createSessionCookie({
  secure: secureCookies,
  domain: config.AUTH_COOKIE_DOMAIN,
})

const app = Fastify({
  loggerInstance: log,
  trustProxy: toFastifyTrustProxy(config.TRUST_PROXY),
  forceCloseConnections: true,
  bodyLimit: BODY_LIMIT_BYTES,
  genReqId: (request) => requestIdFrom(request.headers['x-request-id']),
})

await app.register(helmet)
await app.register(cors, { origin: config.PRODUCT_ORIGIN, credentials: true })
await app.register(rateLimit, { max: GLOBAL_REQUESTS_PER_MINUTE, timeWindow: '1 minute' })

registerGuards(app, {
  productOrigin: config.PRODUCT_ORIGIN,
  exemptFromOrigin: ['/webhooks/github'],
  rules: buildRateRules({
    userIdOf: async (request) =>
      (await sessionFromRequest(services.auth, request))?.user.id ?? null,
  }),
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
    const context = await buildRequestContext(request, reply, { services, sessionCookie })

    const { matched } = await handler.handle(request, reply, { prefix: '/rpc', context })
    if (!matched) return reply.code(404).send({ error: 'NOT_FOUND' })
  })
})

installShutdown({
  steps: [{ name: 'http server', run: () => app.close() }, ...releaseSteps(BOSS_STOP_TIMEOUT_MS)],
  log,
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
})

await app.listen({ port: config.PORT, host: '0.0.0.0' })
