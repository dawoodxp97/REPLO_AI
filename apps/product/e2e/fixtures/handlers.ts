import {
  AddKeyInput,
  AnalyticsQuery,
  ImportRepositoryInput,
  Preferences,
  RepositorySource,
  type AnalyticsReport,
  type ChapterDto,
  type KeyDto,
  type SearchResults,
} from '@replo/contracts'
import { rpcError, type RpcHandlers } from '../support/rpc-types'
import { JOB, JOB_ID, MODEL_CATALOG, PREFLIGHT, SAVED_KEY, USER } from './recorded'
import {
  CHAPTER_ONE,
  HISTORY_ITEMS,
  PROGRESS,
  SAVED_DASHBOARD,
  SOURCE_FILES,
  SOURCE_TREE,
  COURSE_ID,
  COURSE_OVERVIEW,
  COURSE_SUMMARY,
  VERSION_ID,
  WORKSPACE_DIAGRAM,
  WORKSPACE_GRAPH,
  WORKSPACE_NODE,
} from './course'

export const DEFAULT_PREFERENCES = Preferences.parse({
  theme: 'light',
  defaultAudience: 'intermediate',
  autoAdvance: false,
  quizzesEnabled: true,
  browserNotifications: false,
})

export const SEARCH_RESULTS: SearchResults = {
  files: [
    {
      courseId: COURSE_ID,
      versionId: VERSION_ID,
      owner: 'acme',
      repo: 'widgets',
      slug: 'cart-flow',
      path: 'src/cart/thunks.ts',
    },
  ],
  dashboards: [{ dashboardId: SAVED_DASHBOARD.id, name: SAVED_DASHBOARD.name }],
  repositories: [
    { repositoryId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', owner: 'acme', name: 'widgets' },
  ],
  courses: [
    {
      courseId: COURSE_ID,
      title: COURSE_OVERVIEW.course.title,
      owner: 'acme',
      repo: 'widgets',
      slug: 'cart-flow',
    },
  ],
  lessons: [
    {
      courseId: COURSE_ID,
      courseTitle: COURSE_OVERVIEW.course.title,
      owner: 'acme',
      repo: 'widgets',
      slug: 'cart-flow',
      versionId: VERSION_ID,
      chapterKey: 'ch1',
      lessonKey: 'l1',
      title: 'The button dispatches a thunk',
    },
  ],
}

const CHAPTER_TWO: ChapterDto = {
  versionId: VERSION_ID,
  sourceRefs: {},
  chapter: {
    key: 'ch2',
    title: 'Checkout',
    summary: 'How totals are computed.',
    objectives: [],
    prerequisites: [],
    lessons: [
      {
        key: 'l3',
        title: 'Totals',
        minutes: 4,
        blocks: [
          { type: 'prose', md: 'Totals sum the cart lines.', kind: 'observed', evidence: [] },
        ],
      },
    ],
  },
}

const NOTIFICATIONS = [
  {
    id: '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e51',
    kind: 'job_succeeded' as const,
    title: 'Course ready',
    body: 'acme/widgets',
    link: `/jobs/${JOB_ID}`,
    jobId: JOB_ID,
    readAt: null,
    createdAt: '2026-10-23T10:00:00.000Z',
  },
  {
    id: '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e52',
    kind: 'job_failed' as const,
    title: 'Generation failed',
    body: 'acme/internal-tools',
    link: `/jobs/${JOB_ID}`,
    jobId: JOB_ID,
    readAt: null,
    createdAt: '2026-10-23T09:00:00.000Z',
  },
]

export function defaultHandlers(): RpcHandlers {
  const course = COURSE_SUMMARY
  let preferences = DEFAULT_PREFERENCES
  return {
    'me.get': () => ({ body: USER }),
    'me.deleteAccount': () => ({ body: { ok: true } }),

    'auth.providers': () => ({ body: { google: false, github: true } }),
    'auth.signIn': () => ({ body: USER }),
    'auth.signUp': () => ({ body: USER }),
    'auth.signOut': () => ({ body: { ok: true } }),

    'keys.list': () => ({ body: [SAVED_KEY] }),
    'keys.add': ({ input }) => {
      const parsed = AddKeyInput.parse(input)
      const added: KeyDto = {
        id: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
        provider: parsed.provider,
        label: parsed.label,
        last4: parsed.apiKey.slice(-4),
        lastValidatedAt: null,
        createdAt: '2026-10-23T10:05:00.000Z',
      }
      return { body: added }
    },
    'keys.validate': () => ({ body: { valid: true } }),
    'keys.delete': () => ({ body: { ok: true } }),

    'github.listRepos': () => ({ body: [] }),
    'github.installUrl': () => ({
      body: { url: 'https://github.com/apps/replo/installations/new' },
    }),

    'models.catalog': () => ({ body: MODEL_CATALOG }),
    'models.getPreferences': () => ({
      body: { defaultModel: 'claude-haiku-5-5' },
    }),
    'models.setPreferences': ({ input }) => ({ body: input }),

    'repositories.preflight': ({ input }) => {
      RepositorySource.parse(isRecord(input) ? input.source : undefined)
      return { body: PREFLIGHT }
    },
    'repositories.import': ({ input }) => {
      ImportRepositoryInput.parse(input)
      return { body: JOB }
    },
    'repositories.list': () => ({
      body: {
        items: [
          {
            repositoryId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
            owner: 'acme',
            name: 'widgets',
            isPrivate: false,
            defaultBranch: 'main',
            courseCount: 1,
            generationCount: 1,
            lastActivityAt: '2026-10-22T09:30:00.000Z',
            latestJob: null,
          },
        ],
        nextCursor: null,
      },
    }),
    'repositories.remove': () => ({ body: { ok: true } }),

    'jobs.get': () => ({ body: JOB }),
    'jobs.listActive': () => ({
      body: [{ ...JOB, status: 'running', stage: 'lessons', progress: 42 }],
    }),
    'jobs.cancel': () => ({ body: { ...JOB, status: 'canceled' } }),
    'jobs.retry': () => ({ body: { ...JOB, status: 'queued' } }),

    'courses.list': () => ({ body: { items: [course], nextCursor: null } }),
    'courses.get': () => ({ body: COURSE_OVERVIEW }),
    'courses.getChapter': ({ input }) => {
      const chapterKey = isRecord(input) ? input.chapterKey : undefined
      return { body: chapterKey === 'ch2' ? CHAPTER_TWO : CHAPTER_ONE }
    },
    'courses.getSource': ({ input }) => {
      const path = isRecord(input) && typeof input.path === 'string' ? input.path : ''
      const file = SOURCE_FILES[path]
      return file ? { body: file } : rpcError('NOT_FOUND', 404)
    },
    'workspace.graph': () => ({ body: WORKSPACE_GRAPH }),
    'workspace.node': () => ({ body: WORKSPACE_NODE }),
    'workspace.diagram': () => ({ body: WORKSPACE_DIAGRAM }),
    'workspace.tree': () => ({
      body: {
        versionId: VERSION_ID,
        commitSha: COURSE_OVERVIEW.commitSha,
        files: SOURCE_TREE,
      },
    }),
    'courses.delete': () => ({ body: { ok: true } }),

    'learning.getProgress': () => ({ body: PROGRESS }),
    'learning.history': () => ({ body: { items: HISTORY_ITEMS, nextCursor: null } }),
    'learning.markLesson': () => ({ body: PROGRESS }),
    'learning.unmarkLesson': () => ({ body: PROGRESS }),
    'learning.submitQuiz': ({ input }) => {
      const choice = isRecord(input) ? input.choiceKey : undefined
      const correct = choice === 'b'
      return {
        body: {
          correct,
          correctKey: 'b',
          explanation: 'The button dispatches the cart thunk, which writes to the store.',
        },
      }
    },

    'notifications.list': () => ({ body: { items: NOTIFICATIONS, nextCursor: null } }),
    'notifications.unreadCount': () => ({ body: { count: NOTIFICATIONS.length } }),
    'notifications.markRead': ({ input }) => {
      const id = isRecord(input) ? input.id : undefined
      const found = NOTIFICATIONS.find((item) => item.id === id) ?? NOTIFICATIONS[0]
      return { body: { ...found, readAt: '2026-10-23T11:00:00.000Z' } }
    },
    'notifications.markAllRead': () => ({ body: { updated: NOTIFICATIONS.length } }),
    'notifications.delete': () => ({ body: { ok: true } }),

    'dashboard.summary': () => ({
      body: {
        counts: { total: 1, draft: 0, repositories: 1, generations: 1 },
        jobsInFlight: [],
        resume: {
          courseId: COURSE_ID,
          versionId: VERSION_ID,
          lessonKey: 'l2',
          lessonTitle: 'Where the state lives',
          owner: 'acme',
          repo: 'widgets',
          slug: 'cart-flow',
        },
        reading: {
          lessonsCompleted: 1,
          lessonsCompletedLast7Days: 1,
          quizAnswers: 2,
          quizAnswersCorrect: 1,
        },
      },
    }),
    'dashboard.analytics': ({ input }) => ({
      body: analyticsReport(AnalyticsQuery.parse(input)),
    }),
    'dashboard.save': ({ input }) => {
      const parsed = isRecord(input) ? input : {}
      return {
        body: {
          ...SAVED_DASHBOARD,
          name: typeof parsed.name === 'string' ? parsed.name : SAVED_DASHBOARD.name,
          query: AnalyticsQuery.parse(parsed.query),
        },
      }
    },
    'dashboard.listDashboards': () => ({
      body: { items: [SAVED_DASHBOARD], nextCursor: null },
    }),
    'dashboard.deleteDashboard': () => ({ body: { ok: true } }),
    'dashboard.recent': () => ({
      body: {
        items: [
          {
            id: 'activity-1',
            kind: 'course_published',
            title: 'Published How the cart works',
            localDate: '2026-10-22',
            at: '2026-10-22T09:30:00.000Z',
            link: '/courses/acme/widgets/cart-flow',
          },
        ],
        nextCursor: null,
      },
    }),

    'search.all': () => ({ body: SEARCH_RESULTS }),

    'settings.get': () => ({ body: preferences }),
    'settings.update': ({ input }) => {
      preferences = { ...preferences, ...Preferences.partial().parse(input) }
      return { body: preferences }
    },

    'admin.jobs': () => rpcError('NOT_FOUND', 404),
    'admin.job': () => rpcError('NOT_FOUND', 404),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function analyticsReport(query: AnalyticsReport['query']): AnalyticsReport {
  return {
    query,
    series: [
      {
        key: 'job_succeeded',
        label: 'Generations finished',
        points: [
          { bucket: '2026-11-02', value: 2 },
          { bucket: '2026-11-09', value: 1 },
        ],
      },
      {
        key: 'job_failed',
        label: 'Generations failed',
        points: [{ bucket: '2026-11-09', value: 1 }],
      },
      {
        key: 'lesson_completed',
        label: 'Lessons completed',
        points: [{ bucket: '2026-11-09', value: 4 }],
      },
    ],
    summary: {
      jobsSucceeded: 3,
      jobsFailed: 1,
      successRate: 0.75,
      medianTimeToReadySeconds: 640,
    },
    models: [
      { model: 'claude-haiku-5-5', generations: 3 },
      { model: 'anthropic/claude-haiku-5.5', generations: 1 },
    ],
  }
}
