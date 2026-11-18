import type { Workflow } from 'cloudflare:workers'
import type { Logger } from 'pino'
import type { Config } from './config'
import { loadConfig } from './config'
import { createDb, type Db } from './db/client'
import { createLogger } from './logger'
import type { JobQueue } from './queue/job-queue'
import { workflowQueue } from './queue/workflow-queue'
import { inArray } from 'drizzle-orm'
import { generationJobs } from './db/schema'
import { createDomainServices, vaultFrom, type DomainServices } from '../composition'

export interface WorkerEnv {
  // Hyperdrive binding; the deployed pipeline runtime routes Postgres through it.
  HYPERDRIVE?: { connectionString: string }
  // Workflows binding (or service binding) to the CourseGenerationWorkflow class.
  PIPELINE?: Workflow
  [key: string]: unknown
}

export interface CloudflareRuntime {
  config: Config
  log: Logger
  db: Db
  pool: ReturnType<typeof createDb>['pool']
  queue: JobQueue
  domain: DomainServices
  createWorkflowInstance(jobId: string): Promise<boolean>
  queuedJobIds(): Promise<string[]>
}

const ISOLATE_CACHE_LIMIT = 4

// Workers pass `env` only to handlers, not at module scope. Both runtime entries
// capture it once at handler entry: the HTTP worker's fetch wrapper, and the
// pipeline worker's scheduled/Workflow handlers. Every later enqueue reads it.
let currentEnv: WorkerEnv | undefined

export function captureWorkerEnv(env: WorkerEnv): void {
  currentEnv = env
}

const getWorkflow = (): Workflow | undefined => currentEnv?.PIPELINE

// Isolate-level cache: one database pool per Worker isolate instead of one per
// invocation. Bounded so a long-lived isolate holding many Hyperdrive configs
// cannot accumulate unbounded pools.
const cached: { envKey: string; runtime: Promise<CloudflareRuntime> }[] = []

const envKeyOf = (env: WorkerEnv): string =>
  env.HYPERDRIVE?.connectionString ?? String(env.DATABASE_URL ?? '')

export function cloudflareRuntime(env: WorkerEnv): Promise<CloudflareRuntime> {
  const key = envKeyOf(env)
  const hit = cached.find((entry) => entry.envKey === key)
  if (hit) return hit.runtime

  const runtime = buildRuntime(env)
  cached.push({ envKey: key, runtime })
  if (cached.length > ISOLATE_CACHE_LIMIT) cached.shift()
  return runtime
}

async function buildRuntime(env: WorkerEnv): Promise<CloudflareRuntime> {
  // Hyperdrive owns connection pooling on the deployed runtime; its connection string
  // replaces the direct one. Locally (wrangler dev) the binding falls back to
  // localConnectionString or a plain DATABASE_URL var.
  const databaseUrl = env.HYPERDRIVE?.connectionString ?? String(env.DATABASE_URL ?? '')
  const config = loadConfig({ ...process.env, DATABASE_URL: databaseUrl })
  const log = createLogger({
    level: config.LOG_LEVEL,
    pretty: config.NODE_ENV === 'development',
    name: 'worker',
  })
  const { db, pool } = createDb(config.DATABASE_URL, {
    // workerd closes a socket when the request that opened it ends, so the
    // shared pg.Pool would deadlock on its first reuse. One connection per
    // query is the documented Workers/Hyperdrive pattern.
    perQuery: true,
    onPoolError: (err) => log.error({ err }, 'idle pg client error'),
  })

  const workflow = env.PIPELINE
  const createWorkflowInstance = async (jobId: string): Promise<boolean> => {
    if (!workflow) {
      log.warn({ jobId }, 'no PIPELINE binding; job left for the cron sweep')
      return false
    }
    try {
      await workflow.create({ id: jobId, params: { jobId } })
      return true
    } catch (err) {
      // An instance for this id may already exist (retry/re-send). Anything else is
      // logged; the sweep re-checks the job row before the job is lost.
      log.warn({ err, jobId }, 'workflow create failed')
      return false
    }
  }

  const queue = workflowQueue(getWorkflow, log)

  return {
    config,
    log,
    db,
    pool,
    queue,
    domain: createDomainServices({ config, db, queue, vault: vaultFrom(config) }),
    createWorkflowInstance,
    queuedJobIds: () => queuedJobIds(db),
  }
}

const DISPATCHABLE = ['queued', 'waiting_retry', 'stalled'] as const

async function queuedJobIds(db: Db): Promise<string[]> {
  const rows = await db
    .select({ id: generationJobs.id })
    .from(generationJobs)
    .where(inArray(generationJobs.status, DISPATCHABLE))
  return rows.map((row) => row.id)
}
