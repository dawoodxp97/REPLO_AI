import type { Stage } from '@replo/contracts'
import { and, eq } from 'drizzle-orm'
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

  async deleteForJob(jobId: string): Promise<void> {
    await db.delete(jobStageOutputs).where(eq(jobStageOutputs.jobId, jobId))
  },
})
