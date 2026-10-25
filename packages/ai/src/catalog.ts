import { z } from 'zod'

export const PROVIDERS = ['openrouter', 'anthropic', 'openai', 'google'] as const
export type ProviderId = (typeof PROVIDERS)[number]

export const TIERS = ['frontier', 'mid', 'cheap', 'free'] as const
export type Tier = (typeof TIERS)[number]

export const PRESETS = ['free', 'budget', 'balanced', 'quality', 'custom'] as const
export type Preset = (typeof PRESETS)[number]

export const ROLES = ['planner', 'author', 'summarizer'] as const
export type CatalogRole = (typeof ROLES)[number]

const CatalogModel = z.object({
  id: z.string().min(1),
  provider: z.enum(PROVIDERS),
  label: z.string().min(1),
  free: z.boolean(),
  supportsStructuredOutput: z.boolean(),
  inputUsdPerMTok: z.number().nonnegative().nullable(),
  outputUsdPerMTok: z.number().nonnegative().nullable(),
  verified: z.boolean(),
  priceSource: z.string().min(1),
})
export type CatalogModel = z.infer<typeof CatalogModel>

const ProviderTiers = z.object({
  frontier: z.string().nullable(),
  mid: z.string().nullable(),
  cheap: z.string().nullable(),
})

const CatalogFile = z
  .object({
    version: z.literal(1),
    providers: z.object({
      openrouter: ProviderTiers,
      anthropic: ProviderTiers,
      openai: ProviderTiers,
      google: ProviderTiers,
    }),
    models: z.array(CatalogModel),
    freeAllowList: z.array(z.string()),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>()
    for (const model of file.models) {
      if (ids.has(model.id))
        ctx.addIssue({ code: 'custom', message: `duplicate model ${model.id}` })
      ids.add(model.id)
    }
    for (const provider of PROVIDERS) {
      for (const tier of ['frontier', 'mid', 'cheap'] as const) {
        const id = file.providers[provider][tier]
        if (id === null) continue
        const model = file.models.find((candidate) => candidate.id === id)
        if (!model || model.provider !== provider)
          ctx.addIssue({
            code: 'custom',
            message: `${provider}.${tier} must name a model of provider ${provider}`,
          })
      }
    }
    for (const id of file.freeAllowList) {
      const model = file.models.find((candidate) => candidate.id === id)
      if (!model || model.provider !== 'openrouter' || !model.free)
        ctx.addIssue({
          code: 'custom',
          message: `free allow-list entry ${id} must be a free OpenRouter model`,
        })
    }
  })

export interface Catalog {
  file: z.infer<typeof CatalogFile>
  model(provider: ProviderId, id: string): CatalogModel | undefined
}

export function loadCatalog(raw: unknown): Catalog {
  const file = CatalogFile.parse(raw)
  return {
    file,
    model: (provider, id) =>
      file.models.find((model) => model.provider === provider && model.id === id),
  }
}

export type PlanRoles = Record<CatalogRole, string | null>

export type PlanRefusal =
  | { code: 'PRESET_UNAVAILABLE'; reason: string }
  | { code: 'CUSTOM_MODEL_NOT_ALLOWED'; role: CatalogRole; modelId: string }

export type PlanResult =
  { kind: 'ok'; models: PlanRoles } | { kind: 'refused'; refusal: PlanRefusal }

export const PRESET_ROUTING: Record<
  Exclude<Preset, 'free' | 'custom'>,
  Record<CatalogRole, Tier>
> = {
  budget: { planner: 'cheap', author: 'cheap', summarizer: 'cheap' },
  balanced: { planner: 'mid', author: 'mid', summarizer: 'cheap' },
  quality: { planner: 'frontier', author: 'mid', summarizer: 'cheap' },
}

const unavailable = (reason: string): PlanResult => ({
  kind: 'refused',
  refusal: { code: 'PRESET_UNAVAILABLE', reason },
})

const isAccepted = (model: CatalogModel) => model.verified && model.supportsStructuredOutput

export function tierModel(
  catalog: Catalog,
  provider: ProviderId,
  tier: Tier,
): CatalogModel | undefined {
  if (tier === 'free') return undefined
  const id = catalog.file.providers[provider][tier]
  return id === null ? undefined : catalog.model(provider, id)
}

export function planFor(
  catalog: Catalog,
  provider: ProviderId,
  preset: Preset,
  custom: Partial<Record<CatalogRole, string>> = {},
): PlanResult {
  if (preset === 'free') {
    const model = catalog.file.freeAllowList
      .map((id) => catalog.model('openrouter', id))
      .find((candidate) => candidate !== undefined)
    if (provider !== 'openrouter')
      return unavailable('the free preset runs on OpenRouter :free models')
    if (!model) return unavailable('no free model has passed the eval gate yet')
    return { kind: 'ok', models: { planner: model.id, author: model.id, summarizer: null } }
  }

  if (preset === 'custom') {
    const models: PlanRoles = { planner: null, author: null, summarizer: null }
    for (const role of ROLES) {
      const id = custom[role]
      if (id === undefined) continue
      const model = catalog.model(provider, id)
      if (!model || !isAccepted(model))
        return { kind: 'refused', refusal: { code: 'CUSTOM_MODEL_NOT_ALLOWED', role, modelId: id } }
      models[role] = id
    }
    if (ROLES.every((role) => models[role] !== null)) return { kind: 'ok', models }
    const fallback = planFor(catalog, provider, 'balanced')
    if (fallback.kind === 'refused') return fallback
    return {
      kind: 'ok',
      models: {
        planner: models.planner ?? fallback.models.planner,
        author: models.author ?? fallback.models.author,
        summarizer: models.summarizer ?? fallback.models.summarizer,
      },
    }
  }

  const routing = PRESET_ROUTING[preset]
  const models: PlanRoles = { planner: null, author: null, summarizer: null }
  for (const role of ROLES) {
    const tier = routing[role]
    const model = tierModel(catalog, provider, tier)
    if (!model) return unavailable(`${provider} has no ${tier} model for ${role}`)
    if (!isAccepted(model))
      return unavailable(`${model.id} is unverified or lacks structured output`)
    models[role] = model.id
  }
  return { kind: 'ok', models }
}
