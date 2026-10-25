import {
  MICROS_PER_USD,
  type GenerationJobDto,
  type ImportRepositoryInput,
  type ModelPlan,
  type Pipeline,
  type PreflightResult,
  type Provider,
  type RepositorySource,
  type RunEstimate,
} from '@replo/contracts'
import {
  estimateRun,
  type CatalogRole,
  type PlanRoles,
  type RunEstimate as EstimatedRun,
} from '@replo/ai'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { ok, refused, type Outcome } from '../../platform/outcome'
import { toRepositoryMetadata } from '../github/github.events'
import type { JobService } from '../generation/jobs.service'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeysService } from '../keys/keys.service'
import type { ModelsService } from '../models/models.service'
import type { Preflight, PreflightRefusal, ResolvedRepository } from './preflight'
import { repositoriesRepo } from './repositories.repo'

export type PlanRefusal =
  | PreflightRefusal
  | { code: 'FREE_PRESET_REQUIRES_OPENROUTER' }
  | { code: 'PRESET_UNAVAILABLE'; reason: string }
  | { code: 'CUSTOM_MODEL_NOT_ALLOWED'; role: CatalogRole; modelId: string }
  | { code: 'BUDGET_BELOW_ESTIMATE'; estimateUsd: number; budgetUsd: number }

interface PlannedRun {
  provider: Provider
  pipeline: Pipeline
  models: PlanRoles
  estimate: EstimatedRun
  estimateUsd: number
  budgetUsd: number
  resolution: ResolvedRepository
}

export type ImportRefusal =
  PlanRefusal | { code: 'KEY_INVALID' } | { code: 'KEY_CHECK_UNAVAILABLE' }

export interface RepositoryImports {
  preflight(
    userId: string,
    source: RepositorySource,
  ): Promise<Outcome<PreflightResult, PreflightRefusal>>
  estimate(userId: string, input: ImportRepositoryInput): Promise<Outcome<RunEstimate, PlanRefusal>>
  importRepository(
    userId: string,
    idempotencyKey: string,
    input: ImportRepositoryInput,
  ): Promise<Outcome<GenerationJobDto, ImportRefusal>>
}

interface RepositoryImportsDeps {
  db: Db
  preflight: Preflight
  jobs: Pick<JobService, 'findByIdempotencyKey' | 'createJob' | 'toDto'>
  indexing: Pick<IndexingService, 'ensureSnapshot'>
  keys: Pick<KeysService, 'getOwned' | 'validate'>
  models: Pick<ModelsService, 'plan' | 'priceOf'>
  defaults: { budgetUsd: number; litePipelineMaxFiles: number }
}

const LITE_PRESETS = new Set<ImportRepositoryInput['preset']>(['free', 'budget'])

export function createRepositoryImports(deps: RepositoryImportsDeps): RepositoryImports {
  const { db, preflight, jobs, indexing, keys, models, defaults } = deps

  const plan = async (
    userId: string,
    input: ImportRepositoryInput,
  ): Promise<Outcome<PlannedRun, PlanRefusal>> => {
    const key = await keys.getOwned(userId, input.keyId)
    if (!key) notFound('Key')
    if (input.preset === 'free' && key.provider !== 'openrouter')
      return refused({ code: 'FREE_PRESET_REQUIRES_OPENROUTER' })

    const planned = models.plan(key.provider, input.preset, input.customModels ?? {})
    if (planned.kind === 'refused') {
      const refusal = planned.refusal
      return refused(
        refusal.code === 'CUSTOM_MODEL_NOT_ALLOWED'
          ? refusal
          : { code: 'PRESET_UNAVAILABLE' as const, reason: refusal.reason },
      )
    }

    const resolution = await preflight.resolve(userId, input.source)
    if (resolution.kind === 'refused') return resolution

    const { summary } = resolution.value
    const pipeline = LITE_PRESETS.has(input.preset) ? 'lite' : 'full'
    if (pipeline === 'lite' && summary.sourceFileCount > defaults.litePipelineMaxFiles)
      return refused({
        code: 'PRESET_UNAVAILABLE',
        reason: `the ${input.preset} preset handles repositories up to ${defaults.litePipelineMaxFiles} source files`,
      })

    const price = (modelId: string | null) => {
      if (modelId === null) return null
      return models.priceOf(key.provider, modelId) ?? 'unpriced'
    }
    const planner = price(planned.models.planner)
    const author = price(planned.models.author)
    const summarizer = price(planned.models.summarizer)
    if (
      planner === 'unpriced' ||
      author === 'unpriced' ||
      summarizer === 'unpriced' ||
      planner === null ||
      author === null
    )
      return refused({
        code: 'PRESET_UNAVAILABLE',
        reason: 'the chosen models have unverified prices',
      })

    const estimate = estimateRun({
      pipeline,
      totalBytes: summary.totalBytes,
      roles: { planner, author, summarizer },
    })
    const budgetUsd = input.budgetUsd ?? defaults.budgetUsd
    const estimateUsd = estimate.costMicros / MICROS_PER_USD
    if (estimateUsd > budgetUsd)
      return refused({ code: 'BUDGET_BELOW_ESTIMATE', estimateUsd, budgetUsd })

    return ok({
      provider: key.provider,
      pipeline,
      models: planned.models,
      estimate,
      estimateUsd,
      budgetUsd,
      resolution: resolution.value,
    })
  }

  return {
    preflight: (userId, source) => preflight.run(userId, source),

    async estimate(userId, input) {
      const outcome = await plan(userId, input)
      if (outcome.kind === 'refused') return outcome
      const run = outcome.value
      return ok({
        pipeline: run.pipeline,
        models: {
          planner: run.models.planner ?? '',
          author: run.models.author ?? '',
          summarizer: run.models.summarizer,
        },
        requests: run.estimate.requests,
        inputTokens: run.estimate.inputTokens,
        outputTokens: run.estimate.outputTokens,
        estimateUsd: run.estimateUsd,
        budgetUsd: run.budgetUsd,
        basis: 'static-index-and-catalogue-assumptions' as const,
      })
    },

    async importRepository(userId, idempotencyKey, input) {
      const existing = await jobs.findByIdempotencyKey(userId, idempotencyKey)
      if (existing) return ok(await jobs.toDto(existing))

      const outcome = await plan(userId, input)
      if (outcome.kind === 'refused') return outcome
      const verdict = await keys.validate(userId, input.keyId)
      if (verdict.kind === 'refused') return refused({ code: 'KEY_CHECK_UNAVAILABLE' })
      if (!verdict.value) return refused({ code: 'KEY_INVALID' })
      const run = outcome.value
      const { repo, installationId, commitSha } = run.resolution

      const budgetMicros = Math.round(run.budgetUsd * MICROS_PER_USD)
      const modelPlan: ModelPlan = {
        provider: run.provider,
        preset: input.preset,
        pipeline: run.pipeline,
        models: {
          planner: run.models.planner ?? '',
          author: run.models.author ?? '',
          summarizer: run.models.summarizer,
          judge: null,
        },
        budgetMicros,
      }

      const { job } = await db.transaction(async (tx) => {
        const repos = repositoriesRepo(tx)
        const repositoryId = await repos.upsertRepository(toRepositoryMetadata(repo))
        await repos.linkUser(userId, repositoryId, installationId)
        const snapshotId = await indexing.ensureSnapshot(tx, { repositoryId, commitSha })
        return jobs.createJob(tx, {
          userId,
          snapshotId,
          idempotencyKey,
          audience: input.audience,
          keyId: input.keyId,
          models: modelPlan,
          budgetMicros,
        })
      })
      return ok(await jobs.toDto(job))
    },
  }
}
