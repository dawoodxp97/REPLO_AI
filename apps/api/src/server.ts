import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { RPCHandler } from '@orpc/server/fastify'
import type { Logger } from 'pino'
import Fastify from 'fastify'
import { createDomainServices, createServices, vaultFrom } from './composition'
import { registerJobEventsRoute } from './modules/jobs/job-events.route'
import { registerGithubSetup } from './modules/github/github.setup.route'
import { registerAuthRoutes } from './modules/identity/auth.route'
import { createOAuthClients } from './modules/identity/oauth'
import { sessionFromRequest } from './modules/identity/session-request'
import { createSessionCookie } from './modules/identity/session'
import { registerNotificationsStream } from './modules/notifications/notifications.stream.route'
import { registerGuards } from './platform/http-guards'
import { requestIdFrom } from './platform/http-guards'
import type { JobQueue } from './platform/queue/job-queue'
import { buildRateRules } from './platform/rate-limit-rules'
import { toFastifyTrustProxy } from './platform/trust-proxy'
import type { Config } from './platform/config'
import type { Db } from './platform/db/client'
import { buildRequestContext } from './request-context'
import type { Services } from './request-context'
import { router } from './router'

const BODY_LIMIT_BYTES = 1_048_576
const GLOBAL_REQUESTS_PER_MINUTE = 300

export interface HttpAppDeps {
  config: Config
  log: Logger
  db: Db
  // Minimal shape the /readyz probe needs; the pg.Pool satisfies it.
  pool: { query(query: string): Promise<unknown> }
  queue: JobQueue
  // @fastify/rate-limit keeps its counters in an interval-swept in-memory store,
  // which is unreliable on Workers (timers do not survive between invocations).
  // The HTTP worker disables it there; route-level rules still apply.
  globalRateLimit: boolean
  // On Workers, Fastify's built-in pino integration fails at boot (pino's
  // interop breaks in workerd); the HTTP entry passes false and logs itself.
  disableFastifyLogger?: boolean
  // The Workers entry runs the seed after the first response instead of
  // blocking boot on a database write; defaults to true (Node entrypoints).
  seedAdmin?: boolean
}

export interface HttpApp {
  app: ReturnType<typeof Fastify>
  // Built from config; the caller must close these when it owns a process.
  services: Services
}

export async function buildHttpApp(deps: HttpAppDeps): Promise<HttpApp> {
  const { config, log, db, pool, queue } = deps

  const vault = vaultFrom(config)
  const oauth = createOAuthClients(config)
  const domain = createDomainServices({ config, db, queue, vault })
  const services = createServices({ config, db, domain, oauth, vault })
  // Boot must not throw on seeding: the Workers runtime validates a deploy by
  // starting the Worker, and a database hiccup here must not fail the deploy.
  if (deps.seedAdmin !== false) {
    try {
      await services.adminSeed.seed(config.ADMIN_EMAILS)
    } catch (err) {
      log.warn({ err }, 'admin seed skipped; it retries on the next boot')
    }
  }
  const secureCookies = config.NODE_ENV === 'production'
  const sessionCookie = createSessionCookie({
    secure: secureCookies,
    domain: config.AUTH_COOKIE_DOMAIN,
  })

  const app = Fastify({
    ...(deps.disableFastifyLogger ? { logger: false as const } : {}),
    loggerInstance: deps.disableFastifyLogger ? undefined : log,
    trustProxy: toFastifyTrustProxy(config.TRUST_PROXY),
    forceCloseConnections: true,
    bodyLimit: BODY_LIMIT_BYTES,
    genReqId: (request) => requestIdFrom(request.headers['x-request-id']),
    // avvio's boot timers are unreliable on Workers (they fire on a clock the
    // isolate does not advance between requests); disabling the timeout lets
    // boot complete via microtasks. This is the documented Fastify-on-Workers
    // configuration (pluginTimeout: 0).
    ...(deps.disableFastifyLogger ? { pluginTimeout: 0 } : {}),
  })

  if (deps.disableFastifyLogger) {
    // Request logging without pino: one line per request, and errors via the
    // runtime logger that the entry chose.
    app.addHook('onResponse', async (request, reply) => {
      log.info(
        { reqId: request.id, method: request.method, url: request.url, status: reply.statusCode },
        'request',
      )
    })
    app.addHook('onError', async (request, reply, err) => {
      log.error({ err, url: request.url }, 'request error')
    })
  }

  await app.register(helmet)
  await app.register(cors, { origin: config.PRODUCT_ORIGIN, credentials: true })
  if (deps.globalRateLimit)
    await app.register(rateLimit, { max: GLOBAL_REQUESTS_PER_MINUTE, timeWindow: '1 minute' })

  registerGuards(app, {
    productOrigin: config.PRODUCT_ORIGIN,
    exemptFromOrigin: [],
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
    scope.addContentTypeParser(
      '*',
      { parseAs: 'buffer', bodyLimit: BODY_LIMIT_BYTES },
      (_req, _body, done) => done(null, undefined),
    )
    const handler = new RPCHandler(router)

    scope.all('/rpc/*', async (request, reply) => {
      const context = await buildRequestContext(request, reply, { services, sessionCookie })

      const { matched } = await handler.handle(request, reply, { prefix: '/rpc', context })
      if (!matched) return reply.code(404).send({ error: 'NOT_FOUND' })
    })
  })

  return { app, services }
}
