import { oc } from '@orpc/contract'
import { z } from 'zod'
import { ModelPreset, ModelRole, Provider } from './common'

export const Pipeline = z.enum(['full', 'lite'])
export type Pipeline = z.infer<typeof Pipeline>

export const ModelPlan = z.object({
  provider: Provider,
  preset: ModelPreset,
  pipeline: Pipeline,
  models: z.object({
    planner: z.string(),
    author: z.string(),
    summarizer: z.string().nullable(),
    judge: z.string().nullable(),
  }),
  budgetMicros: z.number().int().nonnegative(),
})
export type ModelPlan = z.infer<typeof ModelPlan>

export const CustomModels = z
  .object({ planner: z.string(), author: z.string(), summarizer: z.string() })
  .partial()
export type CustomModels = z.infer<typeof CustomModels>

export const CustomModelRefusal = z.object({
  role: ModelRole,
  modelId: z.string(),
})

export const ModelPreferences = z.object({
  preset: ModelPreset,
  customModels: CustomModels.nullable(),
  defaultBudgetUsd: z.number().positive().max(50).nullable(),
})
export type ModelPreferences = z.infer<typeof ModelPreferences>

export const Tier = z.enum(['frontier', 'mid', 'cheap', 'free'])
export type Tier = z.infer<typeof Tier>

export const CatalogModel = z.object({
  id: z.string(),
  provider: Provider,
  label: z.string(),
  free: z.boolean(),
  supportsStructuredOutput: z.boolean(),
  inputUsdPerMTok: z.number().nullable(),
  outputUsdPerMTok: z.number().nullable(),
  verified: z.boolean(),
})
export type CatalogModel = z.infer<typeof CatalogModel>

export const PresetInfo = z.object({
  preset: ModelPreset,
  label: z.string(),
  description: z.string(),
  routing: z.object({
    planner: Tier.nullable(),
    author: Tier.nullable(),
    summarizer: Tier.nullable(),
  }),
})
export type PresetInfo = z.infer<typeof PresetInfo>

export const ModelCatalog = z.object({
  presets: z.array(PresetInfo),
  models: z.array(CatalogModel),
  freeAllowList: z.array(z.string()),
})
export type ModelCatalog = z.infer<typeof ModelCatalog>

export const modelsContract = {
  catalog: oc.route({ method: 'GET', path: '/models/catalog' }).output(ModelCatalog),
  getPreferences: oc.route({ method: 'GET', path: '/models/preferences' }).output(ModelPreferences),
  setPreferences: oc
    .route({ method: 'PUT', path: '/models/preferences' })
    .input(ModelPreferences)
    .output(ModelPreferences)
    .errors({ CUSTOM_MODEL_NOT_ALLOWED: { data: CustomModelRefusal } }),
}
