import { buildHttpApp } from './server'
import { bootstrap } from './platform/bootstrap'
import { pgBossQueue } from './platform/queue/job-queue'
import { installShutdown } from './platform/shutdown'

const BOSS_STOP_TIMEOUT_MS = 5_000
const SHUTDOWN_TIMEOUT_MS = 15_000

const { config, log, db, pool, boss, releaseSteps } = await bootstrap('api', {
  supervise: false,
  schedule: false,
})

const { app } = await buildHttpApp({
  config,
  log,
  db,
  pool,
  queue: pgBossQueue(boss),
  globalRateLimit: true,
})

installShutdown({
  steps: [{ name: 'http server', run: () => app.close() }, ...releaseSteps(BOSS_STOP_TIMEOUT_MS)],
  log,
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
})

await app.listen({ port: config.PORT, host: '0.0.0.0' })
