import type {
  AdminJobDetail,
  AdminJobRow,
  AdminQueueRow,
  AdminSummary,
  AdminSystemStatus,
  AdminUserRow,
} from '@replo/contracts'

const JOB_ID = '7d2e9c10-5a1b-4f6e-8c3d-9a0b1c2d3e4f'

export const ADMIN_SUMMARY: AdminSummary = {
  users: 128,
  repositories: 342,
  courses: 891,
  jobsInFlight: 3,
  jobsFailedLast24h: 2,
  storageBytes: 5_176_934_400,
}

export const ADMIN_USERS: AdminUserRow[] = [
  {
    id: 'user-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'admin',
    createdAt: '2026-09-01T08:00:00.000Z',
    lastSeenAt: '2026-11-18T09:12:00.000Z',
    repositories: 12,
    courses: 34,
    jobs: 41,
  },
  {
    id: 'user-2',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role: 'user',
    createdAt: '2026-09-14T11:30:00.000Z',
    lastSeenAt: null,
    repositories: 3,
    courses: 5,
    jobs: 7,
  },
]

export const ADMIN_JOBS: AdminJobRow[] = [
  {
    jobId: JOB_ID,
    userId: 'user-2',
    status: 'running',
    stage: 'lessons',
    progress: 62,
    pipeline: 'full',
    errorCode: null,
    errorMessage: null,
    attempts: 1,
    createdAt: '2026-11-18T08:55:00.000Z',
    finishedAt: null,
  },
  {
    jobId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    userId: 'user-1',
    status: 'failed',
    stage: 'validate',
    progress: 88,
    pipeline: 'lite',
    errorCode: 'RATE_LIMITED',
    errorMessage: 'Provider rate limit reached for this model.',
    attempts: 2,
    createdAt: '2026-11-17T14:10:00.000Z',
    finishedAt: '2026-11-17T14:42:00.000Z',
  },
]

export const ADMIN_JOB_DETAIL: AdminJobDetail = {
  job: ADMIN_JOBS[0]!,
  stages: [
    { stage: 'ingest', status: 'completed', attempt: 1, finishedAt: '2026-11-18T08:56:00.000Z' },
    { stage: 'index', status: 'completed', attempt: 1, finishedAt: '2026-11-18T08:58:00.000Z' },
    { stage: 'enrich', status: 'completed', attempt: 1, finishedAt: '2026-11-18T09:05:00.000Z' },
  ],
}

export const ADMIN_QUEUES: AdminQueueRow[] = [
  { name: 'generate-course', queued: 2, active: 1, failed: 0, lastRunAt: '2026-11-18T09:10:00.000Z' },
  { name: 'reap-stalled-jobs', queued: 0, active: 0, failed: 0, lastRunAt: '2026-11-18T09:00:00.000Z' },
  { name: 'purge-retention', queued: 0, active: 0, failed: 0, lastRunAt: '2026-11-18T03:00:00.000Z' },
]

export const ADMIN_SYSTEM: AdminSystemStatus = {
  database: 'up',
  queues: ADMIN_QUEUES,
  jobs: { queued: 2, running: 1, stalled: 0, failed24h: 2 },
  storageBytes: 5_176_934_400,
  version: '0.1.0',
}