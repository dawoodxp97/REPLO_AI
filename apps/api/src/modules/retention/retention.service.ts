import type { JobHistory } from '../generation/job-history.service'
import type { IndexingService } from '../indexing/indexing.service'
import type { NotificationsService } from '../notifications/notifications.service'
import type { PipelineService } from '../pipeline/pipeline.service'

const DAY_MS = 24 * 60 * 60 * 1000
const EVENT_RETENTION_DAYS = 90
const CLOSED_JOB_RETENTION_DAYS = 30
const NOTIFICATION_RETENTION_DAYS = 90

interface RetentionDeps {
  jobs: Pick<JobHistory, 'purgeHistory'>
  pipeline: Pick<PipelineService, 'purgeOutputs'>
  indexing: Pick<IndexingService, 'purgeUnreferenced'>
  notifications: Pick<NotificationsService, 'purgeCreatedBefore'>
}

interface RetentionReport {
  finishedJobs: number
  snapshotsPurged: number
  notificationsPurged: number
}

export interface RetentionService {
  run(now: Date): Promise<RetentionReport>
}

export function createRetentionService(deps: RetentionDeps): RetentionService {
  return {
    async run(now) {
      const oneDayAgo = new Date(now.getTime() - DAY_MS)
      const finished = await deps.jobs.purgeHistory({
        eventsBefore: new Date(now.getTime() - EVENT_RETENTION_DAYS * DAY_MS),
        succeededBefore: oneDayAgo,
        closedBefore: new Date(now.getTime() - CLOSED_JOB_RETENTION_DAYS * DAY_MS),
      })
      await deps.pipeline.purgeOutputs(finished)
      const snapshotsPurged = await deps.indexing.purgeUnreferenced(oneDayAgo)
      const notificationsPurged = await deps.notifications.purgeCreatedBefore(
        new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * DAY_MS),
      )
      return { finishedJobs: finished.length, snapshotsPurged, notificationsPurged }
    },
  }
}
