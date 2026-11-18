// "replo-api" Worker: the Cloudflare replacement of main.http.ts.
//
// Boot is lazy because bindings (HYPERDRIVE, PIPELINE) only exist on the
// request's `env`. Only a *settled* result is cached: a promise created inside
// one request cannot be awaited by another (`handle_cross_request_promise_resolution`),
// so a cold start served by one request must not strand the requests that
// arrive while it runs — they build their own server instead. Once built, the
// Fastify instance is reused for the isolate's lifetime.
// cloudflare:node's httpServerHandler binds Fastify's http.Server to the
// Worker fetch event — no listen call, so there is no port.
import { httpServerHandler } from 'cloudflare:node'
import { captureWorkerEnv, cloudflareRuntime, type WorkerEnv } from './platform/cloudflare-runtime'
import { buildHttpApp } from './server'

type FetchHandler = {
  fetch(request: Request, env: WorkerEnv, ctx: unknown): Promise<Response>
}

interface Booted {
  handler: FetchHandler
  services: Awaited<ReturnType<typeof buildHttpApp>>['services']
  adminEmails: string | undefined
}

async function buildServer(env: WorkerEnv): Promise<Booted> {
  const runtime = await cloudflareRuntime(env)
  const { app, services } = await buildHttpApp({
    config: runtime.config,
    log: runtime.log,
    db: runtime.db,
    pool: runtime.pool,
    // Reads the PIPELINE service binding captured on each request.
    queue: runtime.queue,
    globalRateLimit: false,
    // pino's symbols break under workerd's module interop; Fastify boots
    // with logging off and the hooks in buildHttpApp log instead.
    disableFastifyLogger: true,
    // The admin seed is a database write. It runs after the first response is
    // on its way instead of blocking boot (see startAdminSeed).
    seedAdmin: false,
  })
  // No app.listen(): on workerd it never resolves (no real event loop), which
  // hung the request until the runtime cancelled it. httpServerHandler binds
  // the non-listening http.Server to fetch events directly; app.ready()
  // finishes avvio's plugin boot before the first dispatch.
  await app.ready()
  return {
    handler: httpServerHandler(app.server) as FetchHandler,
    services,
    adminEmails: runtime.config.ADMIN_EMAILS,
  }
}

let booted: Booted | undefined

async function ensureServer(env: WorkerEnv): Promise<Booted> {
  if (booted) return booted
  booted = await buildServer(env)
  return booted
}

// One seed per isolate, off the request's critical path. Idempotent (an UPDATE
// per configured email), so losing it to an evicted isolate is harmless.
let adminSeedStarted = false
function startAdminSeed(server: Booted, ctx: unknown): void {
  if (adminSeedStarted) return
  adminSeedStarted = true
  const run = server.services.adminSeed
    .seed(server.adminEmails)
    .catch((err) => console.error('admin seed failed', err))
  const waitUntil = (ctx as { waitUntil?: (p: Promise<unknown>) => void } | undefined)?.waitUntil
  if (waitUntil) waitUntil.call(ctx, run)
  else void run
}

export default {
  fetch: async (request, env, ctx) => {
    captureWorkerEnv(env)
    const server = await ensureServer(env)
    startAdminSeed(server, ctx)
    return server.handler.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<WorkerEnv>
