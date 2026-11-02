import {
  MICROS_PER_USD,
  type ImportRepositoryInput,
  type Pipeline,
  type Provider,
} from '@replo/contracts'
import type { estimateRun, CatalogRole, PlanRoles, RunCostEstimate } from '@replo/ai'
import { ok, refused, type Outcome } from '../../platform/outcome'
import type { ModelsService } from '../models/models.service'
import type { PreflightRefusal, ResolvedRepository } from './preflight'

export type PlanRefusal =
  | PreflightRefusal
  | { code: 'FREE_PRESET_REQUIRES_OPENROUTER' }
  | { code: 'PRESET_UNAVAILABLE'; reason: string }
  | { code: 'CUSTOM_MODEL_NOT_ALLOWED'; role: CatalogRole; modelId: string }
  | { code: 'BUDGET_BELOW_ESTIMATE'; estimateUsd: number; budgetUsd: number }

export interface RunModels {
  planner: string
  author: string
  summarizer: string | null
}

type PricedRoles = Parameters<typeof estimateRun>[0]['roles']

const LITE_PRESETS = new Set<ImportRepositoryInput['preset']>(['free', 'budget'])

export function selectModels(
  models: Pick<ModelsService, 'plan'>,
  key: { provider: Provider },
  input: ImportRepositoryInput,
): Outcome<PlanRoles, PlanRefusal> {
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

export function checkPipeline(
  input: ImportRepositoryInput,
  summary: ResolvedRepository['summary'],
  litePipelineMaxFiles: number,
): Outcome<Pipeline, PlanRefusal> {
  const pipeline = LITE_PRESETS.has(input.preset) ? 'lite' : 'full'
  if (pipeline === 'lite' && summary.indexableFileCount > litePipelineMaxFiles)
    return refused({
      code: 'PRESET_UNAVAILABLE',
      reason: `the ${input.preset} preset handles repositories up to ${litePipelineMaxFiles} source files`,
    })
  return ok(pipeline)
}

export function pricePlan(
  models: Pick<ModelsService, 'priceOf'>,
  provider: Provider,
  planned: PlanRoles,
): Outcome<{ models: RunModels; roles: PricedRoles }, PlanRefusal> {
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

export function checkBudget(estimate: RunCostEstimate, budgetUsd: number): Outcome<number, PlanRefusal> {
  const estimateUsd = estimate.costMicros / MICROS_PER_USD
  return estimateUsd > budgetUsd
    ? refused({ code: 'BUDGET_BELOW_ESTIMATE', estimateUsd, budgetUsd })
    : ok(estimateUsd)
}
