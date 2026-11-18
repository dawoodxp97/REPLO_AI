import type { AdminQueueRow } from '@replo/contracts'
import { count, inArray, sql } from 'drizzle-orm'
import type { Db } from '../../platform/db/client'
import { generationJobs } from '../../platform/db/schema'
import type PgBoss from 'pg-boss'
import { GENERATE_COURSE, PURGE_RETENTION, REAP_STALLED_JOBS } from '../../worker/job-payload'

export const ADMIN_QUEUE_NAMES = [GENERATE_COURSE, REAP_STALLED_JOBS, PURGE_RETENTION] as const

export interface AdminQueues {
  list(): Promise<AdminQueueRow[]>
}

export interface AdminQueueDeps {
  // pg-boss on the Node runtime; undefined on Cloudflare, where counts come from job rows.
  boss?: PgBoss | undefined
  db: Db
}

const pgBossQueueStats = (boss: PgBoss) => ({
  async list(): Promise<AdminQueueRow[]> {
    const rows: AdminQueueRow[] = []
    for (const name of ADMIN_QUEUE_NAMES) {
      try {
        const [queue, queued, active, failed] = await Promise.all([
          boss.getQueue(name),
          boss.getQueueSize(name),
          boss.getQueueSize(name, { before: 'active' }),
          boss.getQueueSize(name, { before: 'failed' }),
        ])
        rows.push({
          name,
          queued,
          active,
          failed,
          lastRunAt: queue?.updatedOn?.toISOString() ?? null,
        })
      } catch {
        rows.push({ name, queued: 0, active: 0, failed: 0, lastRunAt: null })
      }
    }
    return rows
  },
})

// On the Cloudflare runtime the queue tables do not exist; the honest equivalent is
// the generation_jobs statuses themselves: queued/waiting_retry/stalled are queued
// work, running is active, failed is failed. The reaper and retention entries show
// their cron schedule as lastRunAt via the jobs they touched.
const jobRowQueueStats = (db: Db) => ({
  async list(): Promise<AdminQueueRow[]> {
    const counts = await db
      .select({ status: generationJobs.status, total: count() })
      .from(generationJobs)
      .groupBy(generationJobs.status)
    const byStatus = new Map<string, number>(counts.map((row) => [row.status, Number(row.total)]))
    const lastTouched = await db
      .select({
        at: sql<
          string | null
        >`max(coalesce(${generationJobs.heartbeatAt}, ${generationJobs.createdAt}))`,
      })
      .from(generationJobs)
      .where(inArray(generationJobs.status, ['queued', 'waiting_retry', 'stalled', 'running']))
    const lastRunAt = lastTouched[0]?.at ?? null
    const read = (...statuses: string[]) =>
      statuses.reduce((total, status) => total + (byStatus.get(status) ?? 0), 0)

    return [
      {
        name: GENERATE_COURSE,
        queued: read('queued', 'waiting_retry', 'stalled'),
        active: read('running', 'canceling'),
        failed: read('failed'),
        lastRunAt,
      },
      {
        name: REAP_STALLED_JOBS,
        queued: 0,
        active: 0,
        failed: 0,
        lastRunAt,
      },
      {
        name: PURGE_RETENTION,
        queued: 0,
        active: 0,
        failed: 0,
        lastRunAt: null,
      },
    ]
  },
})

export function createAdminQueues(deps: AdminQueueDeps): AdminQueues {
  if (deps.boss) return pgBossQueueStats(deps.boss)
  return jobRowQueueStats(deps.db)
}
