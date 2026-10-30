import type {
  GenerationJobDto,
  KeyDto,
  ModelCatalog,
  PreflightResult,
  RunEstimate,
} from '@replo/contracts'

export const USER = {
  user: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', image: null },
  signInMethods: { password: true, google: false, github: true },
}

export const KEY_ID = '0b6f6a52-4c3e-4d2a-9d55-1a2b3c4d5e6f'

export const SAVED_KEY: KeyDto = {
  id: KEY_ID,
  provider: 'openrouter',
  label: 'default',
  last4: 'a1b2',
  lastValidatedAt: null,
  createdAt: '2026-10-20T09:00:00.000Z',
}

export const MODEL_CATALOG: ModelCatalog = {
  presets: [
    {
      preset: 'free',
      label: 'Free',
      description: 'OpenRouter :free models. Costs you nothing, needs an OpenRouter key.',
      routing: { planner: 'free', author: 'free', summarizer: 'free' },
    },
    {
      preset: 'budget',
      label: 'Budget',
      description: 'Cheap paid models. Lite pipeline, small bill.',
      routing: { planner: 'cheap', author: 'cheap', summarizer: 'cheap' },
    },
    {
      preset: 'balanced',
      label: 'Balanced',
      description: 'Full pipeline. Good quality for most repos.',
      routing: { planner: 'mid', author: 'mid', summarizer: 'cheap' },
    },
    {
      preset: 'quality',
      label: 'Quality',
      description: 'Strongest models. Full pipeline, highest bill.',
      routing: { planner: 'frontier', author: 'frontier', summarizer: 'mid' },
    },
    {
      preset: 'custom',
      label: 'Custom',
      description: 'Choose a verified model for each role.',
      routing: { planner: null, author: null, summarizer: null },
    },
  ],
  models: [],
  freeAllowList: [],
}

export const PREFLIGHT: PreflightResult = {
  repo: {
    owner: 'acme',
    name: 'widgets',
    isPrivate: false,
    defaultBranch: 'main',
    license: 'MIT',
  },
  commitSha: '3f9c1a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6',
  stats: {
    fileCount: 412,
    sourceFileCount: 268,
    indexableFileCount: 268,
    totalBytes: 1_843_200,
    languages: { typescript: 240, javascript: 28 },
    framework: 'Next.js',
  },
}

export const ESTIMATE: RunEstimate = {
  pipeline: 'full',
  models: { planner: 'mid-planner', author: 'mid-author', summarizer: 'cheap-summarizer' },
  requests: 38,
  inputTokens: 412_000,
  outputTokens: 96_000,
  estimateUsd: 0.42,
  budgetUsd: 2,
  basis: 'static-index-and-catalogue-assumptions',
}

export const JOB_ID = '7d2e9c10-5a1b-4f6e-8c3d-9a0b1c2d3e4f'

export const JOB: GenerationJobDto = {
  jobId: JOB_ID,
  repositoryId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  commitSha: PREFLIGHT.commitSha,
  status: 'queued',
  stage: null,
  progress: 0,
  budgetUsd: 2,
  spentUsd: 0,
  tutorialId: null,
  error: null,
}
