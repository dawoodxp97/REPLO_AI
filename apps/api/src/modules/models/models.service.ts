import type {
  CatalogModel,
  ModelCatalog,
  ModelPlan,
  ModelPreferences,
  Provider,
} from '@replo/contracts'
import type { Catalog } from '@replo/ai'
import type { Db } from '../../platform/db/client'
import { ok, refused, type Outcome } from '../../platform/outcome'
import { modelsRepo } from './models.repo'

export interface ModelRefusal {
  modelId: string
}

export interface ModelsService {
  catalog(): ModelCatalog
  getPreferences(userId: string): Promise<ModelPreferences>
  setPreferences(
    userId: string,
    input: ModelPreferences,
  ): Promise<Outcome<ModelPreferences, ModelRefusal>>
  plan(provider: Provider, modelId: string): ModelPlan | undefined
}

export function createModelsService(deps: { db: Db; catalog: Catalog }): ModelsService {
  const { db, catalog } = deps
  const repo = modelsRepo(db)

  const usable = (provider: Provider, modelId: string): CatalogModel | undefined =>
    catalog.file.models.find(
      (model) =>
        model.id === modelId &&
        model.provider === provider &&
        model.supportsStructuredOutput &&
        model.verified,
    )

  const toDto = (row: { defaultModel: string | null } | undefined): ModelPreferences => ({
    defaultModel: row?.defaultModel ?? null,
  })

  const getPreferences = async (userId: string): Promise<ModelPreferences> =>
    toDto(await repo.find(userId))

  return {
    catalog() {
      return {
        models: catalog.file.models.map((model) => ({
          id: model.id,
          provider: model.provider,
          label: model.label,
          free: model.free,
          supportsStructuredOutput: model.supportsStructuredOutput,
          verified: model.verified,
        })),
        freeAllowList: catalog.file.freeAllowList,
      }
    },

    getPreferences,

    async setPreferences(userId, input) {
      if (input.defaultModel !== null) {
        const model = catalog.file.models.find((candidate) => candidate.id === input.defaultModel)
        if (!model || !model.supportsStructuredOutput || !model.verified)
          return refused({ modelId: input.defaultModel })
      }
      await repo.upsert(userId, { defaultModel: input.defaultModel })
      return ok(await getPreferences(userId))
    },

    plan(provider, modelId) {
      const model = usable(provider, modelId)
      if (!model) return undefined
      // Free models run the lite path: deterministic summaries, system-built diagrams only.
      return {
        provider,
        pipeline: model.free ? 'lite' : 'full',
        models: { planner: modelId, author: modelId, summarizer: modelId },
      }
    },
  }
}
