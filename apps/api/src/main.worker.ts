import { createServer } from 'node:http'
import { Budget } from '@replo/ai'
import PgBoss from 'pg-boss'
import { createDomainServices } from './composition'
import { handleGenerateTutorial } from './jobs/generate-tutorial.worker'
import { declareQueues } from './jobs/queues'
import { GENERATE_TUTORIAL, PURGE_RETENTION, REAP_STALLED_JOBS } from './jobs/schemas'
import { loadConfig } from './platform/config'
import { createDb } from './platform/db/client'
import { createLogger } from './platform/logger'
import { pgBossQueue } from './platform/queue/job-queue'

const config = loadConfig()
const log = createLogger({
  level: config.LOG_LEVEL,
  pretty: config.NODE_ENV === 'development',
  name: 'worker',
})
const { db, pool } = createDb(config.DATABASE_URL)

const boss = new PgBoss({ connectionString: config.DATABASE_URL })
boss.on('error', (err) => log.error({ err }, 'pg-boss error'))
await boss.start()
await declareQueues(boss)

const services = createDomainServices({ config, db, queue: pgBossQueue(boss) })

for (let i = 0; i < config.WORKER_CONCURRENCY; i++) {
  await boss.work(GENERATE_TUTORIAL, { pollingIntervalSeconds: 2 }, async (batch) => {
    for (const job of batch)
      await handleGenerateTutorial(job.data, {
        jobs: services.jobRuntime.jobStore,
        log,
        stageHandlers: services.pipeline.stageHandlers,
        budgetFor: (row) =>
          new Budget(row.budgetMicros, services.jobRuntime.usageSink, row.spentMicros),
      })
  })
}

await boss.schedule(REAP_STALLED_JOBS, '* * * * *')
await boss.work(REAP_STALLED_JOBS, () => services.jobRuntime.requeueStalled())

await boss.schedule(PURGE_RETENTION, '0 3 * * *')
await boss.work(PURGE_RETENTION, async () => {
  const report = await services.retention.run(new Date())
  log.info({ ...report }, 'retention purge finished')
})

const health = createServer((req, res) => {
  res.writeHead(req.url === '/healthz' ? 200 : 404, { 'content-type': 'application/json' })
  res.end(req.url === '/healthz' ? '{"ok":true}' : '{"error":"NOT_FOUND"}')
})
health.listen(config.WORKER_HEALTH_PORT, '0.0.0.0')
log.info(
  { concurrency: config.WORKER_CONCURRENCY, healthPort: config.WORKER_HEALTH_PORT },
  'worker started',
)

const shutdown = async (signal: string) => {
  log.info({ signal }, 'worker shutting down')
  health.close()
  await boss.stop({ graceful: true, timeout: 30_000 })
  await pool.end()
  process.exit(0)
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
