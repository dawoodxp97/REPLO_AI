import type { Stage } from '@replo/contracts'
import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { jobCheckpoints } from '../../platform/db/schema'

export const checkpointsRepo = (db: DbOrTx) => ({
  async find(jobId: string, stage: Stage, checkpointKey: string): Promise<unknown | undefined> {
    const [row] = await db
      .select({ payload: jobCheckpoints.payload })
      .from(jobCheckpoints)
      .where(
        and(
          eq(jobCheckpoints.jobId, jobId),
          eq(jobCheckpoints.stage, stage),
          eq(jobCheckpoints.unit, checkpointKey),
        ),
      )
      .limit(1)
    return row?.payload
  },

  async upsert(
    jobId: string,
    stage: Stage,
    checkpointKey: string,
    payload: unknown,
  ): Promise<void> {
    await db
      .insert(jobCheckpoints)
      .values({ jobId, stage, unit: checkpointKey, payload })
      .onConflictDoUpdate({
        target: [jobCheckpoints.jobId, jobCheckpoints.stage, jobCheckpoints.unit],
        set: { payload },
      })
  },

  async deleteForJob(jobId: string): Promise<void> {
    await db.delete(jobCheckpoints).where(eq(jobCheckpoints.jobId, jobId))
  },
})
