import { and, count, desc, eq, gte, ilike, or, sql } from 'drizzle-orm'
import type { AdminSummary } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import {
  courses,
  generationJobs,
  repositories,
  snapshotFiles,
  userRepositories,
} from '../../platform/db/schema'
import { users } from '../../platform/db/auth-schema'

const DAY_MS = 24 * 60 * 60 * 1000

export const adminRepo = (db: Db) => ({
  async isAdmin(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.role, 'admin')))
      .limit(1)
    return row !== undefined
  },

  async overview(): Promise<AdminSummary> {
    const since = new Date(Date.now() - DAY_MS)
    const [[userRow], [repoRow], [courseRow], [inFlight], [failed], [storage]] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(repositories),
      db.select({ value: count() }).from(courses),
      db
        .select({ value: count() })
        .from(generationJobs)
        .where(sql`${generationJobs.status} = any(${['queued', 'running', 'canceling', 'waiting_retry', 'stalled']})`),
      db
        .select({ value: count() })
        .from(generationJobs)
        .where(and(eq(generationJobs.status, 'failed'), gte(generationJobs.finishedAt, since))),
      db
        .select({ value: sql<number>`coalesce(sum(${snapshotFiles.sizeBytes}), 0)`.mapWith(Number) })
        .from(snapshotFiles),
    ])
    return {
      users: userRow?.value ?? 0,
      repositories: repoRow?.value ?? 0,
      courses: courseRow?.value ?? 0,
      jobsInFlight: inFlight?.value ?? 0,
      jobsFailedLast24h: failed?.value ?? 0,
      storageBytes: storage?.value ?? 0,
    }
  },

  usersPage(limit: number, offset: number, q?: string) {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        repositories: sql<number>`(select count(*) from ${userRepositories} where ${userRepositories.userId} = ${users.id} and ${userRepositories.revokedAt} is null)`.mapWith(
          Number,
        ),
        courses: sql<number>`(select count(*) from ${courses} where ${courses.userId} = ${users.id})`.mapWith(
          Number,
        ),
        jobs: sql<number>`(select count(*) from ${generationJobs} where ${generationJobs.userId} = ${users.id})`.mapWith(
          Number,
        ),
      })
      .from(users)
      .where(
        q === undefined ? undefined : or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)),
      )
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit)
      .offset(offset)
  },

  async jobStatuses() {
    const since = new Date(Date.now() - DAY_MS)
    const rows = await db
      .select({ status: generationJobs.status, value: count() })
      .from(generationJobs)
      .groupBy(generationJobs.status)
    const byStatus = new Map(rows.map((row) => [row.status, row.value]))
    const [failed] = await db
      .select({ value: count() })
      .from(generationJobs)
      .where(and(eq(generationJobs.status, 'failed'), gte(generationJobs.finishedAt, since)))
    return {
      queued: byStatus.get('queued') ?? 0,
      running: byStatus.get('running') ?? 0,
      stalled: byStatus.get('stalled') ?? 0,
      failed24h: failed?.value ?? 0,
    }
  },

  async storageBytes(): Promise<number> {
    const [row] = await db
      .select({ value: sql<number>`coalesce(sum(${snapshotFiles.sizeBytes}), 0)`.mapWith(Number) })
      .from(snapshotFiles)
    return row?.value ?? 0
  },

  async databaseUp(): Promise<boolean> {
    try {
      await db.execute(sql`select 1`)
      return true
    } catch {
      return false
    }
  },
})