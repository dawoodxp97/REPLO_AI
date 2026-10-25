import type {
  ChapterDto,
  ProgressDto,
  SourceFileDto,
  SourceTreeEntry,
  TutorialOverviewDto,
  TutorialSummaryDto,
} from '@replo/contracts'
import { PREFLIGHT } from './recorded'

export const TUTORIAL_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
export const VERSION_ID = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f'
export const PREVIOUS_VERSION_ID = 'd2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a'
export const TUTORIAL_SLUG = 'cart-flow'
export const TUTORIAL_TITLE = 'How the cart works'

const SHA = PREFLIGHT.commitSha
const BLOB = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'
const UPDATED = '2026-10-22T09:30:00.000Z'

export const TUTORIAL_SUMMARY: TutorialSummaryDto = {
  id: TUTORIAL_ID,
  slug: TUTORIAL_SLUG,
  title: TUTORIAL_TITLE,
  owner: 'acme',
  repo: 'widgets',
  visibility: 'public',
  audience: 'intermediate',
  currentVersionNo: 2,
  updatedAt: UPDATED,
  progress: 0.33,
}

export const TUTORIAL_OVERVIEW: TutorialOverviewDto = {
  tutorial: TUTORIAL_SUMMARY,
  versionId: VERSION_ID,
  commitSha: SHA,
  draft: false,
  stale: false,
  newerVersionAvailable: false,
  license: 'MIT',
  objectives: ['Trace a click on the cart button to the store'],
  prerequisites: ['Basic TypeScript', 'React hooks'],
  architectureDiagram: {
    mermaid: 'flowchart LR\n  A[Cart button] -->|dispatches| B[Cart thunk]\n  B --> C("Store")',
    caption: 'The cart button dispatches a thunk that writes to the store.',
  },
  outline: [
    {
      key: 'ch1',
      title: 'The click',
      summary: 'What happens when the cart button is pressed.',
      lessons: [
        { key: 'l1', title: 'The button dispatches a thunk', minutes: 5 },
        { key: 'l2', title: 'Where the state lives', minutes: 6 },
      ],
    },
    {
      key: 'ch2',
      title: 'Checkout',
      summary: 'How totals are computed.',
      lessons: [{ key: 'l3', title: 'Totals', minutes: 4 }],
    },
  ],
  versions: [
    { versionId: VERSION_ID, versionNo: 2, publishedAt: UPDATED },
    { versionId: PREVIOUS_VERSION_ID, versionNo: 1, publishedAt: '2026-10-01T08:00:00.000Z' },
  ],
  validation: { confidence: 0.92, draft: false },
  openQuestions: ['Why is the thunk not awaited before the store updates?'],
}

const SOURCE_REFS = {
  'r-button': {
    path: 'src/ui/ProductCard.tsx',
    startLine: 18,
    endLine: 22,
    blobSha: BLOB,
  },
  'r-thunk': {
    path: 'src/cart/thunks.ts',
    startLine: 9,
    endLine: 27,
    blobSha: BLOB,
  },
}

export const CHAPTER_ONE: ChapterDto = {
  versionId: VERSION_ID,
  sourceRefs: SOURCE_REFS,
  chapter: {
    key: 'ch1',
    title: 'The click',
    summary: 'What happens when the cart button is pressed.',
    objectives: ['Follow one click'],
    prerequisites: [],
    lessons: [
      {
        key: 'l1',
        title: 'The button dispatches a thunk',
        minutes: 5,
        blocks: [
          {
            type: 'prose',
            md: 'The button calls `addItem`, so the change flows through one place.',
            kind: 'observed',
            evidence: [{ refId: 'r-button' }],
          },
          { type: 'code', refId: 'r-button', highlight: [[20, 20]], caption: 'The click handler' },
          {
            type: 'prose',
            md: 'Keeping the update in one thunk probably simplifies retries.',
            kind: 'interpretation',
            evidence: [],
          },
          {
            type: 'callout',
            tone: 'tip',
            md: 'Search the repo for `addItem` to find every caller.',
          },
          {
            type: 'diagram',
            mermaid: 'flowchart LR\n  A[Cart button] --> B[Cart thunk]',
            nodeRefs: { A: 'src/ui/ProductCard.tsx', B: 'src/cart/thunks.ts' },
            caption: 'Button to thunk',
          },
          {
            type: 'exercise',
            prompt: 'Trace the call from the button to the store update.',
            hints: ['Start in ProductCard.'],
            solutionRefs: ['r-thunk'],
          },
        ],
        quiz: [
          {
            key: 'q1',
            kind: 'multiple_choice',
            prompt: 'What does the button dispatch?',
            options: [
              { key: 'a', text: 'A raw fetch call' },
              { key: 'b', text: 'A thunk' },
              { key: 'c', text: 'A render' },
            ],
            evidence: [{ refId: 'r-thunk' }],
          },
        ],
      },
      {
        key: 'l2',
        title: 'Where the state lives',
        minutes: 6,
        blocks: [
          { type: 'prose', md: 'The store holds the cart.', kind: 'observed', evidence: [] },
        ],
      },
    ],
  },
}

export const SOURCE_FILES: Record<string, SourceFileDto> = {
  'src/cart/thunks.ts': {
    path: 'src/cart/thunks.ts',
    language: 'typescript',
    blobSha: BLOB,
    commitSha: SHA,
    content: Array.from({ length: 30 }, (_, index) => {
      const line = index + 1
      if (line === 9) return 'export function addItem(item: Item) {'
      if (line === 12) return '  return async (dispatch: Dispatch) => {'
      if (line === 20) return '    dispatch(cartUpdated(next))'
      return `  const filler${line} = ${line}`
    }).join('\n'),
    permalink: `https://github.com/acme/widgets/blob/${SHA}/src/cart/thunks.ts`,
  },
  'src/ui/ProductCard.tsx': {
    path: 'src/ui/ProductCard.tsx',
    language: 'tsx',
    blobSha: BLOB,
    commitSha: SHA,
    content: Array.from({ length: 24 }, (_, index) => `const line${index + 1} = ${index + 1}`).join(
      '\n',
    ),
    permalink: `https://github.com/acme/widgets/blob/${SHA}/src/ui/ProductCard.tsx`,
  },
}

export const SOURCE_TREE: SourceTreeEntry[] = [
  { path: 'README.md', sizeBytes: 640, language: 'markdown', role: 'doc', readable: true },
  { path: 'public/logo.png', sizeBytes: 20480, language: null, role: 'asset', readable: false },
  {
    path: 'src/cart/thunks.ts',
    sizeBytes: 1200,
    language: 'typescript',
    role: 'source',
    readable: true,
  },
  {
    path: 'src/ui/ProductCard.tsx',
    sizeBytes: 900,
    language: 'tsx',
    role: 'source',
    readable: true,
  },
]

export const PROGRESS: ProgressDto = {
  tutorialId: TUTORIAL_ID,
  versionId: VERSION_ID,
  lessons: { l1: 'completed' },
  completed: 1,
  total: 3,
  nextLessonKey: 'l2',
  quizAttempts: 0,
}

export const HISTORY_ITEMS = [
  {
    lessonKey: 'l1',
    title: 'The button dispatches a thunk',
    status: 'completed' as const,
    at: '2026-10-22T10:00:00.000Z',
  },
]
