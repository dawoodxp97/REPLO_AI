import type { Stage } from '@replo/contracts'
import { and, eq, inArray } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { jobStageOutputs } from '../../platform/db/schema'

export const stageOutputsRepo = (db: DbOrTx) => ({
  async find(jobId: string, stage: Stage, unit: string): Promise<unknown | undefined> {
    const [row] = await db
      .select({ payload: jobStageOutputs.payload })
      .from(jobStageOutputs)
      .where(
        and(
          eq(jobStageOutputs.jobId, jobId),
          eq(jobStageOutputs.stage, stage),
          eq(jobStageOutputs.unit, unit),
        ),
      )
      .limit(1)
    return row?.payload
  },

  async upsert(jobId: string, stage: Stage, unit: string, payload: unknown): Promise<void> {
    await db
      .insert(jobStageOutputs)
      .values({ jobId, stage, unit, payload })
      .onConflictDoUpdate({
        target: [jobStageOutputs.jobId, jobStageOutputs.stage, jobStageOutputs.unit],
        set: { payload },
      })
  },

  async deleteForJobs(jobIds: readonly string[]): Promise<void> {
    if (jobIds.length === 0) return
    await db.delete(jobStageOutputs).where(inArray(jobStageOutputs.jobId, [...jobIds]))
  },
})
