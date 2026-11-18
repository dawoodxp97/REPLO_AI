import type {
  AdminJobDetail,
  AdminJobPage,
  AdminJobRow,
  AdminQueueRow,
  AdminSummary,
  AdminSystemStatus,
  AdminUserPage,
} from '@replo/contracts'
import { notFound, requireFound } from '../../platform/errors'
import { decodeOffset, offsetPage } from '../../platform/pagination'
import type { JobHistory } from '../jobs/job-history.service'
import type { Db } from '../../platform/db/client'
import { adminRepo } from './admin.repo'
import { createAdminQueues } from './admin.queues'
import type PgBoss from 'pg-boss'

interface AdminDeps {
  db: Db
  jobs: Pick<JobHistory, 'operatorJobs' | 'operatorJob'>
  // pg-boss on the Node runtime; undefined on Cloudflare (see admin.queues).
  boss?: PgBoss | undefined
}

export interface AdminService {
  overview(userId: string): Promise<AdminSummary>
  users(
    userId: string,
    input: { limit: number; cursor?: string; q?: string },
  ): Promise<AdminUserPage>
  jobs(
    userId: string,
    input: { status?: AdminJobRow['status']; limit: number; cursor?: string },
  ): Promise<AdminJobPage>
  job(userId: string, jobId: string): Promise<AdminJobDetail>
  queues(userId: string): Promise<AdminQueueRow[]>
  system(userId: string): Promise<AdminSystemStatus>
}

export function createAdminService(deps: AdminDeps): AdminService {
  const repo = adminRepo(deps.db)
  const queues = createAdminQueues({ boss: deps.boss, db: deps.db })

  const requireAdmin = async (userId: string) => {
    if (!(await repo.isAdmin(userId))) notFound('Admin screen')
  }

  return {
    async overview(userId) {
      await requireAdmin(userId)
      return repo.overview()
    },

    async users(userId, input) {
      await requireAdmin(userId)
      const offset = decodeOffset(input.cursor)
      const rows = await repo.usersPage(input.limit + 1, offset, input.q)
      const page = offsetPage(rows, offset, input.limit)
      return {
        items: page.items.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role === 'admin' ? ('admin' as const) : ('user' as const),
          createdAt: row.createdAt.toISOString(),
          lastSeenAt: row.updatedAt.toISOString(),
          repositories: row.repositories,
          courses: row.courses,
          jobs: row.jobs,
        })),
        nextCursor: page.nextCursor,
      }
    },

    async jobs(userId, input) {
      await requireAdmin(userId)
      const offset = decodeOffset(input.cursor)
      const rows = await deps.jobs.operatorJobs({
        status: input.status,
        limit: input.limit + 1,
        offset,
      })
      return offsetPage(rows, offset, input.limit)
    },

    async job(userId, jobId) {
      await requireAdmin(userId)
      return requireFound(await deps.jobs.operatorJob(jobId), 'Job')
    },

    async queues(userId) {
      await requireAdmin(userId)
      return queues.list()
    },

    async system(userId) {
      await requireAdmin(userId)
      const [database, jobs, storageBytes, queueRows] = await Promise.all([
        repo.databaseUp(),
        repo.jobStatuses(),
        repo.storageBytes(),
        queues.list(),
      ])
      return {
        database: database ? ('up' as const) : ('down' as const),
        queues: queueRows,
        jobs,
        storageBytes,
        version: process.env.npm_package_version ?? 'dev',
      }
    },
  }
}
