import type { GenerationJobDto, KeyDto, ModelCatalog, PreflightResult } from '@replo/contracts'

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
  models: [
    {
      id: 'claude-haiku-5-5',
      provider: 'anthropic',
      label: 'Claude Haiku',
      free: false,
      supportsStructuredOutput: true,
      verified: true,
    },
    {
      id: 'anthropic/claude-haiku-5.5',
      provider: 'openrouter',
      label: 'Claude Haiku (OpenRouter)',
      free: false,
      supportsStructuredOutput: true,
      verified: true,
    },
  ],
  freeAllowList: [],
}

export const PREFLIGHT: PreflightResult = {
  repo: {
    owner: 'acme',
    name: 'widgets',
    isPrivate: false,
    defaultBranch: 'main',
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

export const JOB_ID = '7d2e9c10-5a1b-4f6e-8c3d-9a0b1c2d3e4f'

export const JOB: GenerationJobDto = {
  jobId: JOB_ID,
  repositoryId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  repository: { owner: 'acme', name: 'widgets' },
  commitSha: PREFLIGHT.commitSha,
  audience: 'intermediate',
  model: 'claude-haiku-5-5',
  status: 'queued',
  stage: null,
  progress: 0,
  courseId: null,
  course: null,
  error: null,
}
