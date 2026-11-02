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
import { requireFound } from '../../platform/errors'
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

interface RunModels {
  planner: string
  author: string
  summarizer: string | null
}

interface PlannedRun {
  provider: Provider
  pipeline: Pipeline
  models: RunModels
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

type PricedRoles = Parameters<typeof estimateRun>[0]['roles']

const LITE_PRESETS = new Set<ImportRepositoryInput['preset']>(['free', 'budget'])

export function createRepositoryImports(deps: RepositoryImportsDeps): RepositoryImports {
  const { db, preflight, jobs, indexing, keys, models, defaults } = deps

  const selectModels = (
    key: { provider: Provider },
    input: ImportRepositoryInput,
  ): Outcome<PlanRoles, PlanRefusal> => {
    if (input.preset === 'free' && key.provider !== 'openrouter')
      return refused({ code: 'FREE_PRESET_REQUIRES_OPENROUTER' })

    const planned = models.plan(key.provider, input.preset, input.customModels ?? {})
    if (planned.kind === 'ok') return ok(planned.models)
    const { refusal } = planned
    return refused(
      refusal.code === 'CUSTOM_MODEL_NOT_ALLOWED'
        ? refusal
        : { code: 'PRESET_UNAVAILABLE' as const, reason: refusal.reason },
    )
  }

  const checkPipeline = (
    input: ImportRepositoryInput,
    summary: ResolvedRepository['summary'],
  ): Outcome<Pipeline, PlanRefusal> => {
    const pipeline = LITE_PRESETS.has(input.preset) ? 'lite' : 'full'
    if (pipeline === 'lite' && summary.indexableFileCount > defaults.litePipelineMaxFiles)
      return refused({
        code: 'PRESET_UNAVAILABLE',
        reason: `the ${input.preset} preset handles repositories up to ${defaults.litePipelineMaxFiles} source files`,
      })
    return ok(pipeline)
  }

  const pricePlan = (
    provider: Provider,
    planned: PlanRoles,
  ): Outcome<{ models: RunModels; roles: PricedRoles }, PlanRefusal> => {
    const priceOf = (modelId: string) => models.priceOf(provider, modelId)
    const planner = planned.planner === null ? undefined : priceOf(planned.planner)
    const author = planned.author === null ? undefined : priceOf(planned.author)
    const summarizer = planned.summarizer === null ? null : priceOf(planned.summarizer)
    if (
      planned.planner === null ||
      planned.author === null ||
      planner === undefined ||
      author === undefined ||
      summarizer === undefined
    )
      return refused({
        code: 'PRESET_UNAVAILABLE',
        reason: 'the chosen models have unverified prices',
      })
    return ok({
      models: {
        planner: planned.planner,
        author: planned.author,
        summarizer: planned.summarizer,
      },
      roles: { planner, author, summarizer },
    })
  }

  const checkBudget = (estimate: EstimatedRun, budgetUsd: number): Outcome<number, PlanRefusal> => {
    const estimateUsd = estimate.costMicros / MICROS_PER_USD
    return estimateUsd > budgetUsd
      ? refused({ code: 'BUDGET_BELOW_ESTIMATE', estimateUsd, budgetUsd })
      : ok(estimateUsd)
  }

  const plan = async (
    userId: string,
    input: ImportRepositoryInput,
  ): Promise<Outcome<PlannedRun, PlanRefusal>> => {
    const key = requireFound(await keys.getOwned(userId, input.keyId), 'Key')

    const selected = selectModels(key, input)
    if (selected.kind === 'refused') return selected

    const resolution = await preflight.resolve(userId, input.source)
    if (resolution.kind === 'refused') return resolution

    const { summary } = resolution.value
    const pipeline = checkPipeline(input, summary)
    if (pipeline.kind === 'refused') return pipeline

    const priced = pricePlan(key.provider, selected.value)
    if (priced.kind === 'refused') return priced

    const estimate = estimateRun({
      pipeline: pipeline.value,
      totalBytes: summary.totalBytes,
      roles: priced.value.roles,
    })
    const budgetUsd = input.budgetUsd ?? defaults.budgetUsd
    const withinBudget = checkBudget(estimate, budgetUsd)
    if (withinBudget.kind === 'refused') return withinBudget

    return ok({
      provider: key.provider,
      pipeline: pipeline.value,
      models: priced.value.models,
      estimate,
      estimateUsd: withinBudget.value,
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
        models: run.models,
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
        models: { ...run.models, judge: null },
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
