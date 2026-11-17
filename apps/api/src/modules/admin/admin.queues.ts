import type { AdminQueueRow } from '@replo/contracts'
import type PgBoss from 'pg-boss'
import { GENERATE_COURSE, PURGE_RETENTION, REAP_STALLED_JOBS } from '../../worker/job-payload'

export const ADMIN_QUEUE_NAMES = [GENERATE_COURSE, REAP_STALLED_JOBS, PURGE_RETENTION] as const

export interface AdminQueues {
  list(): Promise<AdminQueueRow[]>
}

export function createAdminQueues(boss: PgBoss): AdminQueues {
  return {
    async list() {
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
  }
}