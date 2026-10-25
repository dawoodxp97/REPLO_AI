import type { JobEventData, JobEventType, Stage } from '@replo/contracts'
import { and, asc, desc, eq, gt, inArray, lt, ne, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import {
  generationJobs,
  type ErrorDetail,
  jobEvents,
  jobStages,
  llmCalls,
  repoSnapshots,
} from '../../platform/db/schema'

export const IDLE_STATUSES = ['queued', 'waiting_retry', 'stalled'] as const
const IN_FLIGHT_STATUSES = [...IDLE_STATUSES, 'running', 'canceling'] as const
export const RETRYABLE_STATUSES = ['failed', 'canceled'] as const
export const TERMINAL_STATUSES = ['succeeded', 'failed', 'canceled'] as const
export const KEY_REMOVED = 'KEY_REMOVED'
const STALE_AFTER_SECONDS = 120

export const isStatusIn = <T extends string>(statuses: readonly T[], status: string): status is T =>
  statuses.some((candidate) => candidate === status)

export type JobRow = typeof generationJobs.$inferSelect

export interface JobFailure {
  code: string
  detail?: ErrorDetail
}

export interface JobEventInput {
  type: JobEventType
  stage?: Stage | null
  data?: JobEventData | null
}

export const jobsRepo = (db: DbOrTx) => ({
  async findById(jobId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, jobId))
      .limit(1)
    return row
  },

  async findOwned(jobId: string, userId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .select()
      .from(generationJobs)
      .where(and(eq(generationJobs.id, jobId), eq(generationJobs.userId, userId)))
      .limit(1)
    return row
  },

  latestByRepository(userId: string, repositoryIds: string[]) {
    if (repositoryIds.length === 0) return []
    return db
      .selectDistinctOn([repoSnapshots.repositoryId], {
        repositoryId: repoSnapshots.repositoryId,
        jobId: generationJobs.id,
        status: generationJobs.status,
      })
      .from(generationJobs)
      .innerJoin(repoSnapshots, eq(repoSnapshots.id, generationJobs.snapshotId))
      .where(
        and(eq(generationJobs.userId, userId), inArray(repoSnapshots.repositoryId, repositoryIds)),
      )
      .orderBy(repoSnapshots.repositoryId, desc(generationJobs.createdAt))
  },

  async findByIdempotencyKey(userId: string, key: string): Promise<JobRow | undefined> {
    const [row] = await db
      .select()
      .from(generationJobs)
      .where(and(eq(generationJobs.userId, userId), eq(generationJobs.idempotencyKey, key)))
      .limit(1)
    return row
  },

  async claim(jobId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({
        status: 'running',
        heartbeatAt: sql`now()`,
        attempts: sql`${generationJobs.attempts} + 1`,
      })
      .where(and(eq(generationJobs.id, jobId), inArray(generationJobs.status, IDLE_STATUSES)))
      .returning()
    return row
  },

  async heartbeat(jobId: string): Promise<'ok' | 'canceling' | 'stopped'> {
    const [row] = await db
      .update(generationJobs)
      .set({ heartbeatAt: sql`now()` })
      .where(
        and(eq(generationJobs.id, jobId), inArray(generationJobs.status, ['running', 'canceling'])),
      )
      .returning({ status: generationJobs.status })
    if (!row) return 'stopped'
    return row.status === 'canceling' ? 'canceling' : 'ok'
  },

  async addSpend(jobId: string, micros: number): Promise<void> {
    await db
      .update(generationJobs)
      .set({ spentMicros: sql`${generationJobs.spentMicros} + ${micros}` })
      .where(eq(generationJobs.id, jobId))
  },

  failForKey(keyId: string) {
    return db
      .update(generationJobs)
      .set({
        status: 'failed',
        errorCode: KEY_REMOVED,
        errorDetail: null,
        finishedAt: sql`now()`,
      })
      .where(
        and(eq(generationJobs.keyId, keyId), inArray(generationJobs.status, IN_FLIGHT_STATUSES)),
      )
      .returning({ id: generationJobs.id, userId: generationJobs.userId })
  },

  async setStage(jobId: string, stage: Stage, progress?: number) {
    await db
      .update(generationJobs)
      .set({ stage, ...(progress === undefined ? {} : { progress }) })
      .where(eq(generationJobs.id, jobId))
  },

  async finish(
    jobId: string,
    status: 'succeeded' | 'failed' | 'canceled',
    error?: JobFailure,
  ): Promise<{ userId: string } | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({
        status,
        finishedAt: sql`now()`,
        ...(status === 'succeeded' ? { progress: 100 } : {}),
        ...(error ? { errorCode: error.code, errorDetail: error.detail ?? null } : {}),
      })
      .where(and(eq(generationJobs.id, jobId), inArray(generationJobs.status, IN_FLIGHT_STATUSES)))
      .returning({ userId: generationJobs.userId })
    return row
  },

  async markWaitingRetry(jobId: string, error: JobFailure): Promise<{ id: string } | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({ status: 'waiting_retry', errorCode: error.code, errorDetail: error.detail ?? null })
      .where(and(eq(generationJobs.id, jobId), ne(generationJobs.status, 'canceling')))
      .returning({ id: generationJobs.id })
    return row
  },

  async stallStale(): Promise<void> {
    await db
      .update(generationJobs)
      .set({ status: 'stalled', errorCode: 'HEARTBEAT_LOST' })
      .where(
        and(
          eq(generationJobs.status, 'running'),
          sql`${generationJobs.heartbeatAt} < now() - make_interval(secs => ${STALE_AFTER_SECONDS})`,
        ),
      )
  },

  async stalledIds(): Promise<string[]> {
    const rows = await db
      .select({ id: generationJobs.id })
      .from(generationJobs)
      .where(eq(generationJobs.status, 'stalled'))
    return rows.map((r) => r.id)
  },

  async isStageComplete(jobId: string, stage: Stage): Promise<boolean> {
    const [row] = await db
      .select({ status: jobStages.status })
      .from(jobStages)
      .where(and(eq(jobStages.jobId, jobId), eq(jobStages.stage, stage)))
      .limit(1)
    return row?.status === 'completed'
  },

  async completeStage(jobId: string, stage: Stage) {
    await db
      .insert(jobStages)
      .values({
        jobId,
        stage,
        status: 'completed',
        finishedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [jobStages.jobId, jobStages.stage],
        set: {
          status: 'completed',
          finishedAt: sql`now()`,
          attempt: sql`${jobStages.attempt} + 1`,
        },
      })
  },

  async emit(jobId: string, event: JobEventInput) {
    const [row] = await db
      .insert(jobEvents)
      .values({ jobId, type: event.type, stage: event.stage ?? null, data: event.data ?? null })
      .returning({ id: jobEvents.id })
    return row?.id
  },

  async eventsAfter(jobId: string, afterId: number, limit = 200) {
    return db
      .select()
      .from(jobEvents)
      .where(and(eq(jobEvents.jobId, jobId), gt(jobEvents.id, afterId)))
      .orderBy(asc(jobEvents.id))
      .limit(limit)
  },

  async insertJob(values: typeof generationJobs.$inferInsert): Promise<JobRow | undefined> {
    const [row] = await db.insert(generationJobs).values(values).onConflictDoNothing().returning()
    return row
  },

  async requestCancel(jobId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({ status: 'canceling' })
      .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, 'running')))
      .returning()
    return row
  },

  async cancelIfIdle(jobId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({ status: 'canceled', finishedAt: sql`now()` })
      .where(and(eq(generationJobs.id, jobId), inArray(generationJobs.status, IDLE_STATUSES)))
      .returning()
    return row
  },

  async linkTutorial(jobId: string, tutorialId: string): Promise<void> {
    await db.update(generationJobs).set({ tutorialId }).where(eq(generationJobs.id, jobId))
  },

  async resetForRetry(jobId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({
        status: 'queued',
        attempts: 0,
        errorCode: null,
        errorDetail: null,
        finishedAt: null,
      })
      .where(and(eq(generationJobs.id, jobId), inArray(generationJobs.status, RETRYABLE_STATUSES)))
      .returning()
    return row
  },
})

export const retentionRepo = (db: DbOrTx) => ({
  async finishedJobsBefore(succeededBefore: Date, closedBefore: Date): Promise<string[]> {
    const rows = await db
      .select({ id: generationJobs.id })
      .from(generationJobs)
      .where(
        sql`(${generationJobs.status} = 'succeeded' and ${generationJobs.finishedAt} < ${succeededBefore}) or (${generationJobs.status} in ('failed', 'canceled') and ${generationJobs.finishedAt} < ${closedBefore})`,
      )
    return rows.map((row) => row.id)
  },

  async deleteHistoryBefore(cutoff: Date): Promise<void> {
    await db.delete(jobEvents).where(lt(jobEvents.at, cutoff))
    await db.delete(llmCalls).where(lt(llmCalls.createdAt, cutoff))
  },
})

export const readModelRepo = (db: DbOrTx) => ({
  inFlightFor(userId: string, limit: number) {
    return db
      .select({
        jobId: generationJobs.id,
        repositoryId: repoSnapshots.repositoryId,
        status: generationJobs.status,
        stage: generationJobs.stage,
        progress: generationJobs.progress,
      })
      .from(generationJobs)
      .innerJoin(repoSnapshots, eq(repoSnapshots.id, generationJobs.snapshotId))
      .where(
        and(eq(generationJobs.userId, userId), inArray(generationJobs.status, IN_FLIGHT_STATUSES)),
      )
      .orderBy(desc(generationJobs.createdAt))
      .limit(limit)
  },

  recentFor(
    userId: string,
    input: { zone: string; repositoryIds: readonly string[]; limit: number; offset: number },
  ) {
    return db
      .select({
        jobId: generationJobs.id,
        repositoryId: repoSnapshots.repositoryId,
        status: generationJobs.status,
        createdAt: generationJobs.createdAt,
        finishedAt: generationJobs.finishedAt,
        localDate: sql<string>`to_char(coalesce(${generationJobs.finishedAt}, ${generationJobs.createdAt}) AT TIME ZONE ${input.zone}, 'YYYY-MM-DD')`,
      })
      .from(generationJobs)
      .innerJoin(repoSnapshots, eq(repoSnapshots.id, generationJobs.snapshotId))
      .where(
        and(
          eq(generationJobs.userId, userId),
          inArray(repoSnapshots.repositoryId, input.repositoryIds),
        ),
      )
      .orderBy(desc(generationJobs.createdAt), desc(generationJobs.id))
      .limit(input.limit)
      .offset(input.offset)
  },

  operatorPage(filter: { status?: JobRow['status'] | undefined }, limit: number, offset: number) {
    return db
      .select()
      .from(generationJobs)
      .where(filter.status ? eq(generationJobs.status, filter.status) : undefined)
      .orderBy(desc(generationJobs.createdAt), desc(generationJobs.id))
      .limit(limit)
      .offset(offset)
  },

  async operatorDetail(jobId: string) {
    const job = await jobsRepo(db).findById(jobId)
    if (!job) return undefined
    const stages = await db
      .select()
      .from(jobStages)
      .where(eq(jobStages.jobId, jobId))
      .orderBy(asc(jobStages.finishedAt))
    const calls = await db
      .select()
      .from(llmCalls)
      .where(eq(llmCalls.jobId, jobId))
      .orderBy(asc(llmCalls.createdAt))
    return { job, stages, calls }
  },
})

export const llmCallsRepo = (db: DbOrTx) => ({
  async insert(values: typeof llmCalls.$inferInsert): Promise<void> {
    await db.insert(llmCalls).values(values)
  },
})
