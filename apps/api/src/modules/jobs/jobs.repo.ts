import type { JobEventData, JobEventType, Stage } from '@replo/contracts'
import { and, asc, desc, eq, gt, inArray, lt, or, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import {
  IDLE_STATUSES,
  IN_FLIGHT_STATUSES,
  RETRYABLE_STATUSES,
  type TerminalStatus,
} from '../../platform/job-status'
import {
  generationJobs,
  type ErrorDetail,
  jobEvents,
  jobStages,
  jobCheckpoints,
  jobLlmCalls,
  repositorySnapshots,
} from '../../platform/db/schema'

export const KEY_REMOVED = 'KEY_REMOVED'
const STALE_AFTER_SECONDS = 120

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
      .selectDistinctOn([repositorySnapshots.repositoryId], {
        repositoryId: repositorySnapshots.repositoryId,
        jobId: generationJobs.id,
        status: generationJobs.status,
      })
      .from(generationJobs)
      .innerJoin(repositorySnapshots, eq(repositorySnapshots.id, generationJobs.snapshotId))
      .where(
        and(eq(generationJobs.userId, userId), inArray(repositorySnapshots.repositoryId, repositoryIds)),
      )
      .orderBy(repositorySnapshots.repositoryId, desc(generationJobs.createdAt))
  },

  async findByIdempotencyKey(userId: string, key: string): Promise<JobRow | undefined> {
    const [row] = await db
      .select()
      .from(generationJobs)
      .where(and(eq(generationJobs.userId, userId), eq(generationJobs.idempotencyKey, key)))
      .limit(1)
    return row
  },

  // pg-boss delivers at least once. Only an idle job can be claimed, so a duplicate
  // delivery updates nothing and its worker skips it.
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
    // No row: the job left running/canceling without this worker, e.g. its key was
    // deleted (D-044). The worker must stop without writing a status of its own.
    if (!row) return 'stopped'
    return row.status === 'canceling' ? 'canceling' : 'ok'
  },

  async addSpend(jobId: string, micros: number): Promise<void> {
    await db
      .update(generationJobs)
      // Added in SQL, never read-then-write: shared counters must be atomic (RULES §4).
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
        and(eq(generationJobs.providerKeyId, keyId), inArray(generationJobs.status, IN_FLIGHT_STATUSES)),
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
    status: TerminalStatus,
    error?: JobFailure,
    from: readonly JobRow['status'][] = IN_FLIGHT_STATUSES,
  ): Promise<{ userId: string } | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({
        status,
        finishedAt: sql`now()`,
        ...(status === 'succeeded' ? { progress: 100 } : {}),
        ...(error ? { errorCode: error.code, errorDetail: error.detail ?? null } : {}),
      })
      .where(and(eq(generationJobs.id, jobId), inArray(generationJobs.status, [...from])))
      .returning({ userId: generationJobs.userId })
    return row
  },

  async markWaitingRetry(jobId: string, error: JobFailure): Promise<{ id: string } | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({ status: 'waiting_retry', errorCode: error.code, errorDetail: error.detail ?? null })
      .where(
        and(eq(generationJobs.id, jobId), inArray(generationJobs.status, ['running', 'stalled'])),
      )
      .returning({ id: generationJobs.id })
    return row
  },

  // A running job with an old heartbeat has lost its worker (crash, OOM, deploy).
  // Stalled jobs are claimable again, and their completed stages are skipped.
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

  async stalledJobs(): Promise<JobRow[]> {
    return db.select().from(generationJobs).where(eq(generationJobs.status, 'stalled'))
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

  // A running job has a worker: flag it, and the worker aborts on its next heartbeat
  // and writes 'canceled' itself.
  async requestCancel(jobId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({ status: 'canceling' })
      .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, 'running')))
      .returning()
    return row
  },

  // Queued, waiting_retry and stalled jobs have no worker to notice a flag, so they
  // end here directly.
  async cancelIfIdle(jobId: string): Promise<JobRow | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set({ status: 'canceled', finishedAt: sql`now()` })
      .where(and(eq(generationJobs.id, jobId), inArray(generationJobs.status, IDLE_STATUSES)))
      .returning()
    return row
  },

  async lockForUpdate(
    jobId: string,
  ): Promise<{ status: JobRow['status']; attempts: number } | undefined> {
    const [row] = await db
      .select({ status: generationJobs.status, attempts: generationJobs.attempts })
      .from(generationJobs)
      .where(eq(generationJobs.id, jobId))
      .limit(1)
      .for('update')
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

const HISTORY_DELETE_BATCH = 5000

export const retentionRepo = (db: DbOrTx) => ({
  async deleteCheckpointsOfFinishedJobs(succeededBefore: Date, closedBefore: Date): Promise<number> {
    const finished = db
      .select({ id: generationJobs.id })
      .from(generationJobs)
      .where(
        or(
          and(eq(generationJobs.status, 'succeeded'), lt(generationJobs.finishedAt, succeededBefore)),
          and(
            inArray(generationJobs.status, RETRYABLE_STATUSES),
            lt(generationJobs.finishedAt, closedBefore),
          ),
        ),
      )
    const deleted = await db
      .delete(jobCheckpoints)
      .where(inArray(jobCheckpoints.jobId, finished))
      .returning({ jobId: jobCheckpoints.jobId })
    return new Set(deleted.map((row) => row.jobId)).size
  },

  async deleteHistoryBefore(cutoff: Date): Promise<void> {
    let deleted = HISTORY_DELETE_BATCH
    while (deleted === HISTORY_DELETE_BATCH) {
      const rows = await db
        .delete(jobEvents)
        .where(
          inArray(
            jobEvents.id,
            db
              .select({ id: jobEvents.id })
              .from(jobEvents)
              .where(lt(jobEvents.createdAt, cutoff))
              .limit(HISTORY_DELETE_BATCH),
          ),
        )
        .returning({ id: jobEvents.id })
      deleted = rows.length
    }
    deleted = HISTORY_DELETE_BATCH
    while (deleted === HISTORY_DELETE_BATCH) {
      const rows = await db
        .delete(jobLlmCalls)
        .where(
          inArray(
            jobLlmCalls.id,
            db
              .select({ id: jobLlmCalls.id })
              .from(jobLlmCalls)
              .where(lt(jobLlmCalls.createdAt, cutoff))
              .limit(HISTORY_DELETE_BATCH),
          ),
        )
        .returning({ id: jobLlmCalls.id })
      deleted = rows.length
    }
  },
})

export const readModelRepo = (db: DbOrTx) => ({
  inFlightFor(userId: string, limit: number) {
    return db
      .select({
        jobId: generationJobs.id,
        repositoryId: repositorySnapshots.repositoryId,
        status: generationJobs.status,
        stage: generationJobs.stage,
        progress: generationJobs.progress,
      })
      .from(generationJobs)
      .innerJoin(repositorySnapshots, eq(repositorySnapshots.id, generationJobs.snapshotId))
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
        repositoryId: repositorySnapshots.repositoryId,
        status: generationJobs.status,
        createdAt: generationJobs.createdAt,
        finishedAt: generationJobs.finishedAt,
        localDate: sql<string>`to_char(coalesce(${generationJobs.finishedAt}, ${generationJobs.createdAt}) AT TIME ZONE ${input.zone}, 'YYYY-MM-DD')`,
      })
      .from(generationJobs)
      .innerJoin(repositorySnapshots, eq(repositorySnapshots.id, generationJobs.snapshotId))
      .where(
        and(
          eq(generationJobs.userId, userId),
          inArray(repositorySnapshots.repositoryId, input.repositoryIds),
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
      .from(jobLlmCalls)
      .where(eq(jobLlmCalls.jobId, jobId))
      .orderBy(asc(jobLlmCalls.createdAt))
    return { job, stages, calls }
  },
})

export const llmCallsRepo = (db: DbOrTx) => ({
  async insert(values: typeof jobLlmCalls.$inferInsert): Promise<void> {
    await db.insert(jobLlmCalls).values(values)
  },
})
