import { GENERATE_TUTORIAL, GenerateTutorialPayload } from '../../jobs/schemas'
import type { Tx } from '../../platform/db/client'
import type { JobQueue } from '../../platform/queue/job-queue'
import type { JobRow } from './generation.repo'

const jobPayloadOf = (job: JobRow): GenerateTutorialPayload =>
  GenerateTutorialPayload.parse({
    v: 1,
    jobId: job.id,
    userId: job.userId,
    snapshotId: job.snapshotId,
    audience: job.audience,
  })

export const enqueueTutorial = (queue: JobQueue, job: JobRow, tx?: Tx) =>
  queue.send(GENERATE_TUTORIAL, jobPayloadOf(job), {
    singletonKey: job.id,
    ...(tx ? { tx } : {}),
  })
