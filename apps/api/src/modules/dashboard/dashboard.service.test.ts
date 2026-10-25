import type { ActivityItem, ActivityPage } from '@replo/contracts'
import { describe, expect, it, vi } from 'vitest'
import type { InFlightJob, RecentJob } from '../generation/job-history.service'
import type { ResumeTarget } from '../learning/learning.service'
import type { TutorialCounts } from '../tutorials/library.service'
import { createDashboardService, type DashboardDeps } from './dashboard.service'

const USER = 'user-1'
const ZONE = 'UTC'
const LINKED = new Map([['repo-shop', { owner: 'acme', name: 'shop' }]])
const LINKED_IDS = [...LINKED.keys()]

const describeLinked: DashboardDeps['repositories']['describeLinked'] = async (_userId, ids) => {
  const found = new Map<string, { owner: string; name: string }>()
  for (const id of ids) {
    const repository = LINKED.get(id)
    if (repository) found.set(id, repository)
  }
  return found
}

interface PageInput {
  limit: number
  offset: number
}

interface Fixtures {
  published?: ActivityItem[]
  jobs?: RecentJob[]
  inFlight?: InFlightJob[]
  counts?: TutorialCounts
  resume?: ResumeTarget | null
}

function sliceWindow<T>(rows: readonly T[], input: PageInput): T[] {
  return rows.slice(input.offset, input.offset + input.limit)
}

function stubs(fixtures: Fixtures = {}) {
  const publishedRows = fixtures.published ?? []
  const jobRows = fixtures.jobs ?? []
  const inFlightRows = fixtures.inFlight ?? []
  const counts = fixtures.counts ?? { total: 0, draft: 0, private: 0, link: 0, public: 0 }
  const resume = fixtures.resume ?? null
  const recentPublished = vi.fn(async (_userId: string, input: PageInput & { zone: string }) =>
    sliceWindow(publishedRows, input),
  )
  const recentFor = vi.fn(async (_userId: string, input: PageInput & { zone: string }) =>
    sliceWindow(jobRows, input),
  )
  const inFlightFor = vi.fn(async (_userId: string, _limit: number) => inFlightRows)
  const deps: DashboardDeps = {
    tutorials: { counts: async () => counts, recentPublished },
    jobs: { inFlightFor, recentFor },
    learning: { resumeTarget: async () => resume },
    repositories: { describeLinked, linkedIds: async () => LINKED_IDS },
  }
  return { deps, recentPublished, recentFor, inFlightFor }
}

function publishedItem(id: string, at: string): ActivityItem {
  return {
    id,
    kind: 'tutorial_published',
    title: `Published ${id}`,
    localDate: at.slice(0, 10),
    at,
    link: `/tutorials/${id}`,
  }
}

function jobItem(
  jobId: string,
  status: RecentJob['status'],
  repositoryId: string,
  at: string,
): RecentJob {
  return { jobId, repositoryId, status, localDate: at.slice(0, 10), at }
}

const publishedRows = [
  publishedItem('version-a', '2026-10-20T10:00:00.000Z'),
  publishedItem('version-b', '2026-10-18T10:00:00.000Z'),
  publishedItem('version-c', '2026-10-15T10:00:00.000Z'),
]

const jobRows = [
  jobItem('job-1', 'succeeded', 'repo-shop', '2026-10-21T10:00:00.000Z'),
  jobItem('job-2', 'failed', 'repo-shop', '2026-10-19T10:00:00.000Z'),
  jobItem('job-3', 'running', 'repo-shop', '2026-10-17T10:00:00.000Z'),
  jobItem('job-4', 'canceled', 'repo-gone', '2026-10-16T10:00:00.000Z'),
]

function pageSummary(page: ActivityPage) {
  return { ids: page.items.map((item) => item.id), nextCursor: page.nextCursor }
}

describe('dashboard summary', () => {
  it('maps the tutorial counts', async () => {
    const counts = { total: 5, draft: 2, private: 1, link: 1, public: 1 }
    const { deps } = stubs({ counts })
    expect((await createDashboardService(deps).summary(USER)).counts).toEqual(counts)
  })

  it('keeps only in-flight jobs whose repository is linked to the user', async () => {
    const { deps, inFlightFor } = stubs({
      inFlight: [
        {
          jobId: 'job-live',
          repositoryId: 'repo-shop',
          status: 'running',
          stage: 'lessons',
          progress: 40,
        },
        {
          jobId: 'job-revoked',
          repositoryId: 'repo-gone',
          status: 'queued',
          stage: null,
          progress: 0,
        },
      ],
    })
    const summary = await createDashboardService(deps).summary(USER)
    expect(inFlightFor).toHaveBeenCalledWith(USER, 20)
    expect(summary.jobsInFlight).toEqual([
      {
        jobId: 'job-live',
        repositoryId: 'repo-shop',
        owner: 'acme',
        repo: 'shop',
        status: 'running',
        stage: 'lessons',
        progress: 40,
      },
    ])
  })

  it('maps the resume target to the contract shape', async () => {
    const target: ResumeTarget = {
      tutorialId: 'tutorial-1',
      versionId: 'version-1',
      lessonKey: 'lesson-2',
      lessonTitle: 'Routing',
      owner: 'acme',
      repo: 'shop',
      slug: 'shop-tour',
    }
    const { deps } = stubs({ resume: target })
    expect((await createDashboardService(deps).summary(USER)).resume).toEqual(target)
  })

  it('reports no resume target as null', async () => {
    const { deps } = stubs({ resume: null })
    expect((await createDashboardService(deps).summary(USER)).resume).toBeNull()
  })
})

describe('dashboard recent activity', () => {
  it('asks both sources for offset plus limit plus one rows from the start', async () => {
    const { deps, recentPublished, recentFor } = stubs({
      published: publishedRows,
      jobs: jobRows,
    })
    await createDashboardService(deps).recent(USER, { zone: ZONE, limit: 2, cursor: '4' })
    expect(recentPublished).toHaveBeenCalledWith(USER, { zone: ZONE, limit: 7, offset: 0 })
    expect(recentFor).toHaveBeenCalledWith(USER, {
      zone: ZONE,
      repositoryIds: LINKED_IDS,
      limit: 7,
      offset: 0,
    })
  })

  it('merges both sources newest first and pages through them with the cursor', async () => {
    const { deps } = stubs({ published: publishedRows, jobs: jobRows })
    const service = createDashboardService(deps)

    expect(pageSummary(await service.recent(USER, { zone: ZONE, limit: 2 }))).toEqual({
      ids: ['job:job-1', 'version-a'],
      nextCursor: '2',
    })
    expect(pageSummary(await service.recent(USER, { zone: ZONE, limit: 2, cursor: '2' }))).toEqual({
      ids: ['job:job-2', 'version-b'],
      nextCursor: '4',
    })
    expect(pageSummary(await service.recent(USER, { zone: ZONE, limit: 2, cursor: '4' }))).toEqual({
      ids: ['job:job-3'],
      nextCursor: '6',
    })
    expect(pageSummary(await service.recent(USER, { zone: ZONE, limit: 2, cursor: '6' }))).toEqual({
      ids: ['version-c'],
      nextCursor: null,
    })
  })

  it('labels finished jobs by outcome and running jobs as started', async () => {
    const cases: Array<[RecentJob['status'], ActivityItem['kind']]> = [
      ['queued', 'job_started'],
      ['running', 'job_started'],
      ['waiting_retry', 'job_started'],
      ['stalled', 'job_started'],
      ['canceling', 'job_started'],
      ['succeeded', 'job_finished'],
      ['failed', 'job_finished'],
      ['canceled', 'job_finished'],
    ]
    const jobs = cases.map(([status], index) =>
      jobItem(
        `job-${index}`,
        status,
        'repo-shop',
        `2026-10-22T10:${String(index).padStart(2, '0')}:00.000Z`,
      ),
    )
    const { deps } = stubs({ jobs })
    const page = await createDashboardService(deps).recent(USER, { zone: ZONE, limit: 100 })
    expect(Object.fromEntries(page.items.map((item) => [item.id, item.kind]))).toEqual({
      'job:job-0': 'job_started',
      'job:job-1': 'job_started',
      'job:job-2': 'job_started',
      'job:job-3': 'job_started',
      'job:job-4': 'job_started',
      'job:job-5': 'job_finished',
      'job:job-6': 'job_finished',
      'job:job-7': 'job_finished',
    })
  })

  it('titles a job activity with its repository and status and links it to the job', async () => {
    const { deps } = stubs({
      jobs: [jobItem('job-1', 'succeeded', 'repo-shop', '2026-10-21T10:00:00.000Z')],
    })
    const page = await createDashboardService(deps).recent(USER, { zone: ZONE, limit: 10 })
    expect(page).toEqual({
      items: [
        {
          id: 'job:job-1',
          kind: 'job_finished',
          title: 'acme/shop: succeeded',
          localDate: '2026-10-21',
          at: '2026-10-21T10:00:00.000Z',
          link: '/jobs/job-1',
        },
      ],
      nextCursor: null,
    })
  })

  it('passes tutorial activity through unchanged', async () => {
    const { deps } = stubs({ published: publishedRows })
    const page = await createDashboardService(deps).recent(USER, { zone: ZONE, limit: 10 })
    expect(page.items).toEqual(publishedRows)
  })
})
