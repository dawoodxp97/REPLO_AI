import {
  AddKeyInput,
  ImportRepositoryInput,
  Preferences,
  RepositorySource,
  type ChapterDto,
  type KeyDto,
} from '@replo/contracts'
import { APP_ORIGIN } from '../support/origins'
import { rpcError, type RpcHandlers } from '../support/rpc-types'
import { ESTIMATE, JOB, JOB_ID, MODEL_CATALOG, PREFLIGHT, SAVED_KEY, USER } from './recorded'
import {
  CHAPTER_ONE,
  HISTORY_ITEMS,
  PROGRESS,
  SOURCE_FILES,
  SOURCE_TREE,
  TUTORIAL_ID,
  TUTORIAL_OVERVIEW,
  TUTORIAL_SUMMARY,
  VERSION_ID,
} from './tutorial'

export const DEFAULT_PREFERENCES = Preferences.parse({
  theme: 'light',
  defaultAudience: 'intermediate',
  autoAdvance: false,
  quizzesEnabled: true,
  browserNotifications: false,
})

const SHARE_TOKEN = 'share-token-123'

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
    title: 'Tutorial ready',
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
  return {
    'me.get': () => ({ body: USER }),
    'me.deleteAccount': () => ({ body: { ok: true } }),

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
      body: { preset: 'balanced', customModels: null, defaultBudgetUsd: null },
    }),
    'models.setPreferences': ({ input }) => ({ body: input }),

    'repositories.preflight': ({ input }) => {
      RepositorySource.parse(isRecord(input) ? input.source : undefined)
      return { body: PREFLIGHT }
    },
    'repositories.estimate': ({ input }) => {
      ImportRepositoryInput.parse(input)
      return { body: ESTIMATE }
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
            latestJob: null,
          },
        ],
        nextCursor: null,
      },
    }),
    'repositories.remove': () => ({ body: { ok: true } }),

    'jobs.get': () => ({ body: JOB }),
    'jobs.cancel': () => ({ body: { ...JOB, status: 'canceled' } }),
    'jobs.retry': () => ({ body: { ...JOB, status: 'queued' } }),

    'tutorials.list': () => ({ body: { items: [TUTORIAL_SUMMARY], nextCursor: null } }),
    'tutorials.get': () => ({ body: TUTORIAL_OVERVIEW }),
    'tutorials.getChapter': ({ input }) => {
      const chapterKey = isRecord(input) ? input.chapterKey : undefined
      return { body: chapterKey === 'ch2' ? CHAPTER_TWO : CHAPTER_ONE }
    },
    'tutorials.getSource': ({ input }) => {
      const path = isRecord(input) && typeof input.path === 'string' ? input.path : ''
      const file = SOURCE_FILES[path]
      return file ? { body: file } : rpcError('NOT_FOUND', 404)
    },
    'tutorials.sourceTree': () => ({
      body: { commitSha: TUTORIAL_OVERVIEW.commitSha, files: SOURCE_TREE },
    }),
    'tutorials.setVisibility': ({ input }) => {
      const visibility =
        isRecord(input) && typeof input.visibility === 'string' ? input.visibility : 'private'
      return { body: { ...TUTORIAL_SUMMARY, visibility } }
    },
    'tutorials.createShareLink': () => ({
      body: {
        token: SHARE_TOKEN,
        url: `${APP_ORIGIN}/tutorials/acme/widgets/cart-flow?share=${SHARE_TOKEN}`,
      },
    }),
    'tutorials.delete': () => ({ body: { ok: true } }),
    'tutorials.report': () => ({ body: { ok: true } }),

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
        counts: { total: 1, draft: 0, private: 0, link: 0, public: 1 },
        jobsInFlight: [],
        resume: {
          tutorialId: TUTORIAL_ID,
          versionId: VERSION_ID,
          lessonKey: 'l2',
          lessonTitle: 'Where the state lives',
          owner: 'acme',
          repo: 'widgets',
          slug: 'cart-flow',
        },
      },
    }),
    'dashboard.recent': () => ({
      body: {
        items: [
          {
            id: 'activity-1',
            kind: 'tutorial_published',
            title: 'Published How the cart works',
            localDate: '2026-10-22',
            at: '2026-10-22T09:30:00.000Z',
            link: '/tutorials/acme/widgets/cart-flow',
          },
        ],
        nextCursor: null,
      },
    }),

    'search.own': () => ({
      body: {
        repositories: [
          { repositoryId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', owner: 'acme', name: 'widgets' },
        ],
        tutorials: [
          {
            tutorialId: TUTORIAL_ID,
            title: TUTORIAL_OVERVIEW.tutorial.title,
            owner: 'acme',
            repo: 'widgets',
            slug: 'cart-flow',
          },
        ],
        lessons: [
          {
            tutorialId: TUTORIAL_ID,
            versionId: VERSION_ID,
            chapterKey: 'ch1',
            lessonKey: 'l1',
            title: 'The button dispatches a thunk',
          },
        ],
      },
    }),

    'settings.get': () => ({ body: DEFAULT_PREFERENCES }),
    'settings.update': ({ input }) => ({
      body: { ...DEFAULT_PREFERENCES, ...Preferences.partial().parse(input) },
    }),

    'operator.jobs': () => rpcError('NOT_FOUND', 404),
    'operator.job': () => rpcError('NOT_FOUND', 404),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
