import { oc } from '@orpc/contract'
import { z } from 'zod'
import { Provider } from './common'

export const Pipeline = z.enum(['full', 'lite'])
export type Pipeline = z.infer<typeof Pipeline>

export const RoleModels = z.object({
  planner: z.string(),
  author: z.string(),
  summarizer: z.string().nullable(),
})

export const ModelPlan = z.object({
  provider: Provider,
  pipeline: Pipeline,
  models: RoleModels,
})
export type ModelPlan = z.infer<typeof ModelPlan>

export const ModelPreferences = z.object({
  defaultModel: z.string().nullable(),
})
export type ModelPreferences = z.infer<typeof ModelPreferences>

export const CatalogModel = z.object({
  id: z.string(),
  provider: Provider,
  label: z.string(),
  free: z.boolean(),
  supportsStructuredOutput: z.boolean(),
  verified: z.boolean(),
})
export type CatalogModel = z.infer<typeof CatalogModel>

export const ModelCatalog = z.object({
  models: z.array(CatalogModel),
  freeAllowList: z.array(z.string()),
})
export type ModelCatalog = z.infer<typeof ModelCatalog>

export const ModelRefusal = z.object({ modelId: z.string() })

export const modelsContract = {
  catalog: oc.route({ method: 'GET', path: '/models/catalog' }).output(ModelCatalog),
  getPreferences: oc.route({ method: 'GET', path: '/models/preferences' }).output(ModelPreferences),
  setPreferences: oc
    .route({ method: 'PUT', path: '/models/preferences' })
    .input(ModelPreferences)
    .output(ModelPreferences)
    .errors({ MODEL_NOT_ALLOWED: { data: ModelRefusal } }),
}
