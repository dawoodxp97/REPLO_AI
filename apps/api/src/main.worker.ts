import { createServer } from 'node:http'
import { Budget } from '@replo/ai'
import { createDomainServices, vaultFrom } from './composition'
import { handleGenerateTutorial } from './worker/generate-tutorial'
import { GENERATE_TUTORIAL, PURGE_RETENTION, REAP_STALLED_JOBS } from './worker/job-payload'
import { bootstrap } from './platform/bootstrap'
import { pgBossQueue } from './platform/queue/job-queue'
import { installShutdown } from './platform/shutdown'

const BOSS_STOP_TIMEOUT_MS = 30_000
const SHUTDOWN_TIMEOUT_MS = 45_000

const { config, log, db, boss, releaseSteps } = await bootstrap('worker')

const services = createDomainServices({
  config,
  db,
  queue: pgBossQueue(boss),
  vault: vaultFrom(config),
})

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

installShutdown({
  steps: [
    { name: 'health server', run: () => health.close() },
    ...releaseSteps(BOSS_STOP_TIMEOUT_MS),
  ],
  log,
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
})
