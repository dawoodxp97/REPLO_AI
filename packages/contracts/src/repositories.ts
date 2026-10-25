import { oc } from '@orpc/contract'
import { z } from 'zod'
import { Audience, CommitSha, IdCursor, ModelPreset, OkResult, pageInput } from './common'
import { CustomModelRefusal, CustomModels, Pipeline } from './models'
import { GenerationJobDto, JobStatus } from './jobs'

export const RepositorySource = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('public_url'),
    url: z.url().regex(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/),
    ref: z.string().max(255).optional(),
  }),
  z.object({
    kind: z.literal('installation'),
    githubRepoId: z.number().int().positive(),
    ref: z.string().max(255).optional(),
  }),
])
export type RepositorySource = z.infer<typeof RepositorySource>

export const SnapshotStats = z.object({
  fileCount: z.number().int(),
  sourceFileCount: z.number().int(),
  totalBytes: z.number().int(),
  languages: z.record(z.string(), z.number().int()),
  framework: z.string().nullable(),
})
export type SnapshotStats = z.infer<typeof SnapshotStats>

export const RepoLimitData = z.object({
  metric: z.enum(['files', 'bytes']),
  value: z.number().int(),
  limit: z.number().int(),
})
export type RepoLimitData = z.infer<typeof RepoLimitData>

export const PreflightInput = z.object({ source: RepositorySource })
export type PreflightInput = z.infer<typeof PreflightInput>

export const PreflightResult = z.object({
  repo: z.object({
    owner: z.string(),
    name: z.string(),
    isPrivate: z.boolean(),
    defaultBranch: z.string(),
    license: z.string().nullable(),
  }),
  commitSha: CommitSha,
  stats: SnapshotStats,
})
export type PreflightResult = z.infer<typeof PreflightResult>

export const RepositoryListInput = pageInput(IdCursor)
export type RepositoryListInput = z.infer<typeof RepositoryListInput>

export const RepositoryListItem = z.object({
  repositoryId: z.uuid(),
  owner: z.string(),
  name: z.string(),
  isPrivate: z.boolean(),
  defaultBranch: z.string(),
  latestJob: z.object({ jobId: z.uuid(), status: JobStatus }).nullable(),
})
export type RepositoryListItem = z.infer<typeof RepositoryListItem>

export const RepositoryPage = z.object({
  items: z.array(RepositoryListItem),
  nextCursor: IdCursor.nullable(),
})
export type RepositoryPage = z.infer<typeof RepositoryPage>

export const ImportRepositoryInput = z.object({
  source: RepositorySource,
  audience: Audience.default('intermediate'),
  keyId: z.uuid(),
  preset: ModelPreset.default('balanced'),
  customModels: CustomModels.optional(),
  budgetUsd: z.number().positive().max(50).optional(),
})
export type ImportRepositoryInput = z.infer<typeof ImportRepositoryInput>

export const RunEstimate = z.object({
  pipeline: Pipeline,
  models: z.object({
    planner: z.string(),
    author: z.string(),
    summarizer: z.string().nullable(),
  }),
  requests: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  estimateUsd: z.number(),
  budgetUsd: z.number(),
  basis: z.literal('static-index-and-catalogue-assumptions'),
})
export type RunEstimate = z.infer<typeof RunEstimate>

export const PresetUnavailable = z.object({ reason: z.string() })

export const BudgetBelowEstimate = z.object({ estimateUsd: z.number(), budgetUsd: z.number() })

export const repoRefusalErrors = {
  REPO_TOO_LARGE: { data: RepoLimitData },
  REPO_NOT_ACCESSIBLE: {},
  UNSUPPORTED_LANGUAGE: {},
}

export const planRefusalErrors = {
  ...repoRefusalErrors,
  FREE_PRESET_REQUIRES_OPENROUTER: {},
  PRESET_UNAVAILABLE: { data: PresetUnavailable },
  CUSTOM_MODEL_NOT_ALLOWED: { data: CustomModelRefusal },
  BUDGET_BELOW_ESTIMATE: { data: BudgetBelowEstimate },
}

export const repositoriesContract = {
  estimate: oc
    .route({ method: 'POST', path: '/repositories/estimate' })
    .input(ImportRepositoryInput)
    .output(RunEstimate)
    .errors(planRefusalErrors),
  list: oc
    .route({ method: 'GET', path: '/repositories' })
    .input(RepositoryListInput)
    .output(RepositoryPage),
  preflight: oc
    .route({ method: 'POST', path: '/repositories/preflight' })
    .input(PreflightInput)
    .output(PreflightResult)
    .errors(repoRefusalErrors),
  remove: oc
    .route({ method: 'DELETE', path: '/repositories/{repositoryId}' })
    .input(z.object({ repositoryId: z.uuid() }))
    .output(OkResult),
  import: oc
    .route({ method: 'POST', path: '/repositories/import' })
    .input(ImportRepositoryInput)
    .output(GenerationJobDto)
    .errors({
      ...planRefusalErrors,
      KEY_INVALID: {},
      KEY_CHECK_UNAVAILABLE: {},
      IDEMPOTENCY_KEY_REQUIRED: {},
    }),
}
