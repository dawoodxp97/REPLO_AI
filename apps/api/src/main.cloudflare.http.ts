// "replo-api" Worker: the Cloudflare replacement of main.http.ts.
// Boot is lazy (memoized on the first fetch) because the entrypoint is a
// service-binding target and may not use top-level await. cloudflare:node's
// httpServerHandler binds Fastify's http.Server to the Worker fetch event —
// no listen call, so there is no port. Postgres uses the DATABASE_URL secret;
// Hyperdrive pooling is used by the pipeline worker, whose runtime is built
// lazily inside handlers.
import { httpServerHandler } from 'cloudflare:node'
import { captureWorkerEnv, cloudflareRuntime, type WorkerEnv } from './platform/cloudflare-runtime'
import { buildHttpApp } from './server'

type FetchHandler = {
  fetch(request: Request, env: WorkerEnv, ctx: unknown): Promise<Response>
}

let boot: Promise<FetchHandler> | undefined

async function ensureServer(env: WorkerEnv): Promise<FetchHandler> {
  captureWorkerEnv(env)
  if (!boot) {
    boot = (async () => {
      const runtime = await cloudflareRuntime(process.env as never)
      const { app } = await buildHttpApp({
        config: runtime.config,
        log: runtime.log,
        db: runtime.db,
        pool: runtime.pool,
        // Reads the PIPELINE service binding captured above.
        queue: runtime.queue,
        globalRateLimit: false,
        // pino's symbols break under workerd's module interop; Fastify boots
        // with logging off and the hooks in buildHttpApp log instead.
        disableFastifyLogger: true,
      })
      // No app.listen(): on workerd it never resolves (no real event loop), which
      // hung the request until the runtime cancelled it. httpServerHandler binds
      // the non-listening http.Server to fetch events directly; app.ready()
      // finishes avvio's plugin boot before the first dispatch.
      await app.ready()
      return httpServerHandler(app.server) as FetchHandler
    })()
  }
  return boot
}

export default {
  fetch: async (request, env, ctx) => {
    const handler = await ensureServer(env)
    return handler.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<WorkerEnv>
