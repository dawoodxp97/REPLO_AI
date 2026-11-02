import { daysAgo } from '../../platform/time'
import type { SessionService } from '../identity/session.service'
import type { JobHistory } from '../generation/job-history.service'
import type { IndexingService } from '../indexing/indexing.service'
import type { NotificationsService } from '../notifications/notifications.service'
import type { TutorialManager } from '../tutorials/manager.service'

const EVENT_RETENTION_DAYS = 90
const CLOSED_JOB_RETENTION_DAYS = 30
const NOTIFICATION_RETENTION_DAYS = 90

interface RetentionDeps {
  jobs: Pick<JobHistory, 'purgeHistory'>
  indexing: Pick<IndexingService, 'purgeUnreferenced'>
  tutorials: Pick<TutorialManager, 'purgeObsoletePushEvents'>
  notifications: Pick<NotificationsService, 'purgeCreatedBefore'>
  sessions: Pick<SessionService, 'purgeExpired'>
}

interface RetentionReport {
  finishedJobs: number
  snapshotsPurged: number
  notificationsPurged: number
  sessionsPurged: number
}

export interface RetentionService {
  run(now: Date): Promise<RetentionReport>
}

export function createRetentionService(deps: RetentionDeps): RetentionService {
  return {
    async run(now) {
      const oneDayAgo = daysAgo(now, 1)
      const finished = await deps.jobs.purgeHistory({
        eventsBefore: daysAgo(now, EVENT_RETENTION_DAYS),
        succeededBefore: oneDayAgo,
        closedBefore: daysAgo(now, CLOSED_JOB_RETENTION_DAYS),
      })
      const snapshotsPurged = await deps.indexing.purgeUnreferenced(oneDayAgo)
      await deps.tutorials.purgeObsoletePushEvents()
      const notificationsPurged = await deps.notifications.purgeCreatedBefore(
        daysAgo(now, NOTIFICATION_RETENTION_DAYS),
      )
      const sessionsPurged = await deps.sessions.purgeExpired(now)
      return { finishedJobs: finished, snapshotsPurged, notificationsPurged, sessionsPurged }
    },
  }
}
