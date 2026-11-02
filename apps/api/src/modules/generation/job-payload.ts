import { GENERATE_TUTORIAL } from '../../jobs/schemas'
import type { Tx } from '../../platform/db/client'
import type { JobQueue } from '../../platform/queue/job-queue'
import type { JobRow } from './generation.repo'

export const enqueueTutorial = (queue: JobQueue, job: JobRow, tx?: Tx) =>
  queue.send(GENERATE_TUTORIAL, { jobId: job.id }, {
    singletonKey: job.id,
    ...(tx ? { tx } : {}),
  })
