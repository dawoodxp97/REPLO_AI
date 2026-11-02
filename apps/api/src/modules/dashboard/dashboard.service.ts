import type { ActivityItem, ActivityPage, DashboardSummary } from '@replo/contracts'
import { isTerminalStatus, jobLink } from '../../platform/job-status'
import { badRequest } from '../../platform/errors'
import { decodeOffset, offsetPage } from '../../platform/pagination'
import type { JobHistory, RecentJob } from '../generation/job-history.service'
import type { LearningService } from '../learning/learning.service'
import type { RepositoryLibrary } from '../repositories/library.service'
import type { TutorialLibrary } from '../tutorials/library.service'

const IN_FLIGHT_LIMIT = 20
const MAX_FEED_OFFSET = 5000

export interface DashboardDeps {
  tutorials: Pick<TutorialLibrary, 'counts' | 'recentPublished'>
  jobs: Pick<JobHistory, 'inFlightFor' | 'recentFor'>
  learning: Pick<LearningService, 'resumeTarget'>
  repositories: Pick<RepositoryLibrary, 'describeLinked' | 'linkedIds'>
}

export interface DashboardService {
  summary(userId: string): Promise<DashboardSummary>
  recent(
    userId: string,
    input: { zone: string; limit: number; cursor?: string | undefined },
  ): Promise<ActivityPage>
}

type Repository = { owner: string; name: string }
type RecentEntry = ActivityItem | RecentJob

export function createDashboardService(deps: DashboardDeps): DashboardService {
  const { tutorials, jobs, learning, repositories } = deps

  return {
    async summary(userId) {
      const [counts, inFlight, resume] = await Promise.all([
        tutorials.counts(userId),
        jobs.inFlightFor(userId, IN_FLIGHT_LIMIT),
        learning.resumeTarget(userId),
      ])
      const linked = await repositories.describeLinked(
        userId,
        inFlight.map((job) => job.repositoryId),
      )
      return {
        counts,
        jobsInFlight: inFlight.flatMap((job) => {
          const repository = linked.get(job.repositoryId)
          if (!repository) return []
          return [
            {
              jobId: job.jobId,
              repositoryId: job.repositoryId,
              owner: repository.owner,
              repo: repository.name,
              status: job.status,
              stage: job.stage,
              progress: job.progress,
            },
          ]
        }),
        resume,
      }
    },

    async recent(userId, { zone, limit, cursor }) {
      const offset = decodeOffset(cursor)
      if (offset > MAX_FEED_OFFSET) badRequest('Invalid cursor')
      const end = offset + limit
      const repositoryIds = await repositories.linkedIds(userId)
      const [published, recentJobs] = await Promise.all([
        tutorials.recentPublished(userId, { zone, limit: end + 1, offset: 0 }),
        jobs.recentFor(userId, { zone, repositoryIds, limit: end + 1, offset: 0 }),
      ])
      const merged = [...published, ...recentJobs].sort(newestFirst)
      const page = offsetPage(merged.slice(offset), offset, limit)
      const linked = await repositories.describeLinked(
        userId,
        page.items.flatMap((entry) => (isActivityItem(entry) ? [] : [entry.repositoryId])),
      )
      return {
        items: page.items
          .map((entry) => toActivity(entry, linked))
          .filter((item) => item !== undefined),
        nextCursor: page.nextCursor,
      }
    },
  }
}

function newestFirst(a: RecentEntry, b: RecentEntry): number {
  return Date.parse(b.at) - Date.parse(a.at) || entryId(b).localeCompare(entryId(a))
}

function isActivityItem(entry: RecentEntry): entry is ActivityItem {
  return 'kind' in entry
}

function entryId(entry: RecentEntry): string {
  return isActivityItem(entry) ? entry.id : `job:${entry.jobId}`
}

function toActivity(entry: RecentEntry, linked: Map<string, Repository>): ActivityItem | undefined {
  if (isActivityItem(entry)) return entry
  const repository = linked.get(entry.repositoryId)
  if (!repository) return undefined
  return {
    id: entryId(entry),
    kind: isTerminalStatus(entry.status) ? 'job_finished' : 'job_started',
    title: `${repository.owner}/${repository.name}: ${entry.status}`,
    localDate: entry.localDate,
    at: entry.at,
    link: jobLink(entry.jobId),
  }
}
