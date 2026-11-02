import { type ModelCatalog, type ModelPreferences, type Provider } from '@replo/contracts'
import {
  PRESETS,
  ROLES,
  planFor,
  type Catalog,
  type CatalogRole,
  type PlanResult,
  type Preset,
} from '@replo/ai'
import { MICROS_PER_USD } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { ok, refused, type Outcome } from '../../platform/outcome'
import { modelsRepo } from './models.repo'
import { DEFAULT_PREFERENCES, PRESET_COPY, presetRouting, toPreferencesDto } from './models.presets'

interface ModelPrice {
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

export interface CustomModelRefusal {
  role: CatalogRole
  modelId: string
}

export interface ModelsService {
  catalog(): ModelCatalog
  getPreferences(userId: string): Promise<ModelPreferences>
  setPreferences(
    userId: string,
    input: ModelPreferences,
  ): Promise<Outcome<ModelPreferences, CustomModelRefusal>>
  plan(provider: Provider, preset: Preset, custom: Partial<Record<CatalogRole, string>>): PlanResult
  priceOf(provider: Provider, modelId: string): ModelPrice | undefined
}

export function createModelsService(deps: { db: Db; catalog: Catalog }): ModelsService {
  const { db, catalog } = deps
  const repo = modelsRepo(db)

  const getPreferences = async (userId: string): Promise<ModelPreferences> => {
    const row = await repo.find(userId)
    return row ? toPreferencesDto(row) : DEFAULT_PREFERENCES
  }

  return {
    catalog() {
      return {
        presets: PRESETS.map((preset) => ({
          preset,
          ...PRESET_COPY[preset],
          routing: presetRouting(preset),
        })),
        models: catalog.file.models.map((model) => ({
          id: model.id,
          provider: model.provider,
          label: model.label,
          free: model.free,
          supportsStructuredOutput: model.supportsStructuredOutput,
          inputUsdPerMTok: model.inputUsdPerMTok,
          outputUsdPerMTok: model.outputUsdPerMTok,
          verified: model.verified,
        })),
        freeAllowList: catalog.file.freeAllowList,
      }
    },

    getPreferences,

    async setPreferences(userId, input) {
      const custom = input.customModels ?? {}
      for (const role of ROLES) {
        const modelId = custom[role]
        if (modelId === undefined) continue
        const model = catalog.file.models.find((candidate) => candidate.id === modelId)
        if (!model || !model.supportsStructuredOutput || !model.verified)
          return refused({ role, modelId })
      }
      await repo.upsert(userId, {
        preset: input.preset,
        customModels: input.customModels ?? null,
        defaultBudgetMicros:
          input.defaultBudgetUsd === null
            ? null
            : Math.round(input.defaultBudgetUsd * MICROS_PER_USD),
      })
      return ok(await getPreferences(userId))
    },

    plan(provider, preset, custom) {
      return planFor(catalog, provider, preset, custom)
    },

    priceOf(provider, modelId) {
      const model = catalog.model(provider, modelId)
      if (
        !model ||
        !model.verified ||
        model.inputUsdPerMTok === null ||
        model.outputUsdPerMTok === null
      )
        return undefined
      return { inputUsdPerMTok: model.inputUsdPerMTok, outputUsdPerMTok: model.outputUsdPerMTok }
    },
  }
}
